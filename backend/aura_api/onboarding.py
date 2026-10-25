"""Account-owned consent and onboarding eligibility endpoints."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth.routes import service as auth_service
from .auth.service import AuthService
from .auth.store import OnboardingRecord
from .errors import APIError

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])
CONSENT_VERSION = "aura-chat-assessment-storage-v1"
CONSENT_SCOPE = "chat-assessment-storage-demo"


class EligibilityInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True, alias_generator=to_camel)
    relationship: Literal["parent", "legal-guardian"]
    regular_interaction: bool
    age_months: int = Field(ge=12, le=36)


class OnboardingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, alias_generator=to_camel)
    about_acknowledged: bool
    consent_accepted: bool
    consent_version: str | None
    consent_scope: str | None
    consent_accepted_at: datetime | None
    relationship: str
    regular_interaction: bool
    age_months: int | None
    eligibility_confirmed: bool
    completed_at: datetime | None
    required_step: str | None
    consent_version_current: str


def _required_step(record: OnboardingRecord) -> str | None:
    if not record.about_acknowledged:
        return "about"
    if record.consent_version != CONSENT_VERSION or record.consent_scope != CONSENT_SCOPE or not record.consent_accepted_at:
        return "consent"
    if not record.eligibility_confirmed:
        return "parent-child"
    if not record.completed_at:
        return "complete"
    return None


def _response(record: OnboardingRecord) -> OnboardingResponse:
    return OnboardingResponse(
        about_acknowledged=record.about_acknowledged,
        consent_accepted=record.consent_accepted_at is not None,
        consent_version=record.consent_version,
        consent_scope=record.consent_scope,
        consent_accepted_at=record.consent_accepted_at,
        relationship=record.relationship,
        regular_interaction=record.regular_interaction,
        age_months=record.age_months,
        eligibility_confirmed=record.eligibility_confirmed,
        completed_at=record.completed_at,
        required_step=_required_step(record),
        consent_version_current=CONSENT_VERSION,
    )


def _session_user_id(request: Request, auth: AuthService) -> UUID:
    settings = request.app.state.settings
    session = auth.require_session(request.cookies.get(settings.cookie_name))
    return session.user_id


def require_storage_consent(db: Session, user_id: UUID) -> None:
    record = db.scalar(
        select(OnboardingRecord).where(OnboardingRecord.user_id == user_id).with_for_update()
    )
    if (
        record is None
        or record.consent_version != CONSENT_VERSION
        or record.consent_scope != CONSENT_SCOPE
        or record.consent_accepted_at is None
        or not record.eligibility_confirmed
        or record.completed_at is None
    ):
        raise APIError(409, "onboarding_required", "Complete the current consent and eligibility steps first.")


def _locked_record(request: Request, auth: AuthService) -> OnboardingRecord:
    user_id = _session_user_id(request, auth)
    database = request.app.state.database
    with database.sessions.begin() as db:
        # Lock the account row so concurrent first reads create one owned record.
        db.execute(select(OnboardingRecord.user_id).where(OnboardingRecord.user_id == user_id).with_for_update())
        record = db.get(OnboardingRecord, user_id)
        if record is None:
            from .auth.store import UserRecord
            db.execute(select(UserRecord.id).where(UserRecord.id == user_id).with_for_update())
            record = db.get(OnboardingRecord, user_id)
            if record is None:
                record = OnboardingRecord(user_id=user_id)
                db.add(record)
                db.flush()
        db.expunge(record)
    return record


def _lock_existing(db, user_id: UUID) -> OnboardingRecord:
    record = db.scalar(
        select(OnboardingRecord).where(OnboardingRecord.user_id == user_id).with_for_update()
    )
    if record is None:
        raise APIError(409, "onboarding_step_required", "Load your onboarding session and try again.")
    return record


@router.get("", response_model=OnboardingResponse)
def get_onboarding(request: Request, auth: AuthService = Depends(auth_service)) -> OnboardingResponse:
    return _response(_locked_record(request, auth))


@router.post("/about", response_model=OnboardingResponse)
def acknowledge_about(request: Request, auth: AuthService = Depends(auth_service)) -> OnboardingResponse:
    user_id = _session_user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        stored = _lock_existing(db, user_id)
        stored.about_acknowledged = True
        db.flush()
        db.expunge(stored)
    return _response(stored)


@router.post("/consent", response_model=OnboardingResponse)
def accept_consent(request: Request, auth: AuthService = Depends(auth_service)) -> OnboardingResponse:
    user_id = _session_user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        stored = _lock_existing(db, user_id)
        if not stored.about_acknowledged:
            raise APIError(409, "onboarding_step_required", "Review the pre-assessment information first.")
        if (
            stored.consent_version == CONSENT_VERSION
            and stored.consent_scope == CONSENT_SCOPE
            and stored.consent_accepted_at is not None
        ):
            db.expunge(stored)
            return _response(stored)
        stored.consent_version = CONSENT_VERSION
        stored.consent_scope = CONSENT_SCOPE
        stored.consent_accepted_at = datetime.now(UTC)
        stored.eligibility_confirmed = False
        stored.completed_at = None
        db.flush()
        db.expunge(stored)
    return _response(stored)


@router.put("/eligibility", response_model=OnboardingResponse)
def save_eligibility(
    body: EligibilityInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> OnboardingResponse:
    user_id = _session_user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        stored = _lock_existing(db, user_id)
        if _required_step(stored) not in {"parent-child", "complete"}:
            raise APIError(409, "onboarding_step_required", "Accept the demonstration notice before saving eligibility.")
        stored.relationship = body.relationship
        stored.regular_interaction = body.regular_interaction
        stored.age_months = body.age_months
        stored.eligibility_confirmed = True
        stored.completed_at = None
        db.flush()
        db.expunge(stored)
    return _response(stored)


@router.post("/complete", response_model=OnboardingResponse)
def complete_onboarding(request: Request, auth: AuthService = Depends(auth_service)) -> OnboardingResponse:
    user_id = _session_user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        stored = _lock_existing(db, user_id)
        if stored.completed_at is not None and _required_step(stored) is None:
            db.expunge(stored)
            return _response(stored)
        if _required_step(stored) != "complete":
            raise APIError(409, "onboarding_step_required", "Complete the required onboarding steps first.")
        stored.completed_at = datetime.now(UTC)
        db.flush()
        db.expunge(stored)
    return _response(stored)
