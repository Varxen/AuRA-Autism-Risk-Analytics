from datetime import UTC, datetime, timedelta
import re
import secrets
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import Settings
from ..database import Database
from ..errors import APIError
from .schemas import PublicUser, SessionResponse
from .security import hash_password, token_digest, verify_password
from .store import SessionRecord, UserRecord


def utcnow() -> datetime:
    return datetime.now(UTC)


class AuthService:
    def __init__(self, settings: Settings, database: Database):
        self.settings = settings
        self.database = database
        # Unknown accounts still perform the same password KDF as known accounts.
        self._dummy_hash = hash_password(secrets.token_urlsafe(32))

    def register(
        self, email: str, password: str, previous_token: str | None
    ) -> tuple[str, SessionRecord]:
        with self.database.sessions() as db:
            if db.scalar(select(UserRecord.id).where(UserRecord.email == email)):
                self._registration_conflict()
        password_hash = hash_password(password)
        now = utcnow()
        try:
            with self.database.sessions.begin() as db:
                user = UserRecord(
                    id=uuid4(), email=email, password_hash=password_hash,
                    email_verified=False, created_at=now,
                )
                db.add(user)
                db.flush()
                result = self._new_session(db, user.id, previous_token, now)
            return result
        except IntegrityError:
            # Unique email is enforced by PostgreSQL, including concurrent requests.
            with self.database.sessions() as db:
                if db.scalar(select(UserRecord.id).where(UserRecord.email == email)):
                    self._registration_conflict()
            raise

    def login(
        self, email: str, password: str, previous_token: str | None
    ) -> tuple[str, SessionRecord]:
        with self.database.sessions() as db:
            user = db.scalar(select(UserRecord).where(UserRecord.email == email))
        valid = verify_password(password, user.password_hash if user else self._dummy_hash)
        if not valid or user is None:
            raise APIError(401, "invalid_credentials", "Invalid email or password.")
        with self.database.sessions.begin() as db:
            current = db.scalar(select(UserRecord).where(UserRecord.id == user.id).with_for_update())
            if current is None or current.password_hash != user.password_hash:
                raise APIError(401, "invalid_credentials", "Invalid email or password.")
            result = self._new_session(db, user.id, previous_token, utcnow())
        return result

    def current_session(self, raw_token: str | None, *, touch: bool = True) -> SessionRecord | None:
        if not raw_token or not re.fullmatch(r"[A-Za-z0-9_-]{43}", raw_token):
            return None
        with self.database.sessions.begin() as db:
            session = db.scalar(
                select(SessionRecord).where(SessionRecord.token_hash == token_digest(raw_token)).with_for_update()
            )
            if session is None:
                return None
            # Expiry is checked after acquiring the row lock, including lock wait time.
            now = utcnow()
            idle_expiry = session.last_seen_at + timedelta(seconds=self.settings.session_idle_seconds)
            if now >= session.expires_at or now >= idle_expiry:
                db.delete(session)
                return None
            if touch:
                session.last_seen_at = now
        return session

    def require_session(self, raw_token: str | None) -> SessionRecord:
        session = self.current_session(raw_token)
        if session is None:
            raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)
        return session

    def logout(self, raw_token: str | None, csrf_token: str | None) -> None:
        session = self.current_session(raw_token, touch=False)
        if session is None:
            return
        if (
            not csrf_token
            or not re.fullmatch(r"[A-Za-z0-9_-]{43}", csrf_token)
            or not secrets.compare_digest(csrf_token, session.csrf_token)
        ):
            raise APIError(403, "invalid_csrf", "Refresh the session and try again.")
        with self.database.sessions.begin() as db:
            db.execute(delete(SessionRecord).where(SessionRecord.token_hash == token_digest(raw_token)))

    def delete_account(
        self, raw_token: str | None, password: str, csrf_token: str | None
    ) -> None:
        if not raw_token or not re.fullmatch(r"[A-Za-z0-9_-]{43}", raw_token):
            raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)
        if not csrf_token or not re.fullmatch(r"[A-Za-z0-9_-]{43}", csrf_token):
            raise APIError(403, "invalid_csrf", "Refresh the session and try again.")

        session_hash = token_digest(raw_token)
        with self.database.sessions.begin() as db:
            token_session = db.scalar(
                select(SessionRecord).where(SessionRecord.token_hash == session_hash)
            )
            if token_session is None:
                raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)

            user = db.scalar(
                select(UserRecord).where(UserRecord.id == token_session.user_id).with_for_update()
            )
            if user is None:
                raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)

            session = db.scalar(
                select(SessionRecord)
                .where(SessionRecord.token_hash == session_hash, SessionRecord.user_id == user.id)
                .with_for_update()
            )
            if session is None:
                raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)
            now = utcnow()
            if (
                now >= session.expires_at
                or now >= session.last_seen_at + timedelta(seconds=self.settings.session_idle_seconds)
            ):
                raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)
            if not secrets.compare_digest(csrf_token, session.csrf_token):
                raise APIError(403, "invalid_csrf", "Refresh the session and try again.")
            if not verify_password(password, user.password_hash):
                raise APIError(403, "invalid_password_confirmation", "The password confirmation did not match.")

            # PostgreSQL cascades this deletion through sessions, onboarding,
            # assessments, answers, processing results, chats and chat messages.
            db.delete(user)

    def response(self, session: SessionRecord) -> SessionResponse:
        with self.database.sessions() as db:
            user = db.get(UserRecord, session.user_id)
            if user is None:
                raise APIError(401, "session_required", "Sign in to continue.", clear_cookie=True)
            return SessionResponse(
                user=PublicUser(
                    id=user.id, email=user.email, created_at=user.created_at,
                    email_verified=user.email_verified,
                ),
                csrf_token=session.csrf_token,
                expires_at=session.expires_at,
                idle_expires_at=min(
                    session.expires_at,
                    session.last_seen_at + timedelta(seconds=self.settings.session_idle_seconds),
                ),
            )

    @staticmethod
    def _registration_conflict() -> None:
        raise APIError(409, "registration_unavailable", "An account cannot be created with those details.")

    def _new_session(
        self, db: Session, user_id: UUID, previous_token: str | None, now: datetime
    ) -> tuple[str, SessionRecord]:
        if previous_token:
            db.execute(delete(SessionRecord).where(SessionRecord.token_hash == token_digest(previous_token)))
        raw_token = secrets.token_urlsafe(32)
        session = SessionRecord(
            token_hash=token_digest(raw_token), user_id=user_id,
            csrf_token=secrets.token_urlsafe(32), created_at=now, last_seen_at=now,
            expires_at=now + timedelta(seconds=self.settings.session_ttl_seconds),
        )
        db.add(session)
        return raw_token, session
