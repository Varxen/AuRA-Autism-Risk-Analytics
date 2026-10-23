"""Validated local-development PostgreSQL and session configuration."""

from dataclasses import dataclass, field
import os
from urllib.parse import urlsplit
from pathlib import Path
import re

from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url

DEFAULT_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
)


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: URL | str | None = field(default=None, repr=False)
    database_schema: str | None = None
    environment: str = "development"
    frontend_origins: tuple[str, ...] = DEFAULT_ORIGINS
    session_ttl_seconds: int = 28_800
    session_idle_seconds: int = 1_800
    cookie_secure: bool = False
    auth_rate_limit: int = 10
    auth_rate_window_seconds: int = 60

    def __post_init__(self) -> None:
        if self.environment not in {"development", "test"}:
            raise ValueError("This backend supports development/test until production requirements are completed.")
        if self.database_url is None:
            raise ValueError("Configure the PostgreSQL connection in backend/.env.")
        url = make_url(self.database_url)
        if url.drivername != "postgresql+psycopg2":
            raise ValueError("Use PostgreSQL with the psycopg2 driver.")
        if self.database_schema is not None and (
            self.environment != "test"
            or not re.fullmatch(r"aura_test_[a-f0-9]{32}", self.database_schema)
        ):
            raise ValueError("Custom schemas are reserved for isolated test fixtures.")
        if not self.frontend_origins:
            raise ValueError("At least one explicit frontend origin is required.")
        for origin in self.frontend_origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
                or "*" in origin
            ):
                raise ValueError("Frontend origins must be explicit scheme/host/port origins.")
            # Accessing port also rejects malformed or out-of-range port values.
            _ = parsed.port
            if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
                raise ValueError("Plain HTTP frontend origins must be loopback addresses.")
        for value in (
            self.session_ttl_seconds,
            self.session_idle_seconds,
            self.auth_rate_limit,
            self.auth_rate_window_seconds,
        ):
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                raise ValueError("Session and request limits must be positive integers.")
        if self.session_idle_seconds > self.session_ttl_seconds:
            raise ValueError("Idle expiry cannot exceed absolute session expiry.")

    @property
    def cookie_name(self) -> str:
        return "__Host-aura_session" if self.cookie_secure else "aura_session"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
        secure = os.getenv("AURA_COOKIE_SECURE", "false").lower()
        if secure not in {"true", "false"}:
            raise ValueError("AURA_COOKIE_SECURE must be true or false.")
        origins = tuple(
            dict.fromkeys(
                origin.strip()
                for origin in os.getenv("AURA_FRONTEND_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")
                if origin.strip()
            )
        )
        database_url = os.getenv("AURA_DATABASE_URL")
        if not database_url:
            database_user = os.getenv("AURA_DB_USER")
            database_name = os.getenv("AURA_DB_NAME")
            if not database_user or not database_name:
                raise ValueError("Set AURA_DB_NAME and AURA_DB_USER in backend/.env.")
            database_url = URL.create(
                "postgresql+psycopg2",
                username=database_user,
                password=os.getenv("AURA_DB_PASSWORD", ""),
                host=os.getenv("AURA_DB_HOST", "localhost"),
                port=int(os.getenv("AURA_DB_PORT", "5432")),
                database=database_name,
            )
        return cls(
            database_url=database_url,
            environment=os.getenv("AURA_ENV", "development"),
            frontend_origins=origins,
            session_ttl_seconds=int(os.getenv("AURA_SESSION_TTL_SECONDS", "28800")),
            session_idle_seconds=int(os.getenv("AURA_SESSION_IDLE_SECONDS", "1800")),
            cookie_secure=secure == "true",
            auth_rate_limit=int(os.getenv("AURA_AUTH_RATE_LIMIT", "10")),
            auth_rate_window_seconds=int(os.getenv("AURA_AUTH_RATE_WINDOW_SECONDS", "60")),
        )
