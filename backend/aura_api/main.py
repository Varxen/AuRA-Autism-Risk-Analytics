"""ASGI application factory. Run with: uvicorn aura_api.main:create_app --factory --reload."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from sqlalchemy.exc import SQLAlchemyError
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .auth.routes import clear_session_cookie, router as auth_router
from .auth.security import AuthRateLimiter
from .auth.service import AuthService
from .config import TRYCLOUDFLARE_ORIGIN_REGEX, Settings
from .database import Database
from .errors import APIError
from .middleware import APIBoundaryMiddleware
from .assessments import router as assessments_router
from .chats import router as chats_router
from .onboarding import router as onboarding_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    database = Database(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        try:
            database.verify()
        except SQLAlchemyError:
            logging.getLogger(__name__).exception(
                "Database verification failed; check PostgreSQL connectivity and migration state."
            )
            database.engine.dispose()
            raise RuntimeError("PostgreSQL is unavailable or required migrations are missing.") from None
        try:
            yield
        finally:
            database.engine.dispose()

    app = FastAPI(
        lifespan=lifespan,
        title="AuRA API",
        version="0.1.0",
        description="Local development API for authentication, onboarding, educational chat, and assessment inference using the saved Stage 3.1 models with Stage 3.2 soft voting.",
    )
    app.state.settings = settings
    app.state.database = database
    app.state.auth = AuthService(settings, database)
    app.state.auth_limiter = AuthRateLimiter(settings.auth_rate_limit, settings.auth_rate_window_seconds)
    app.add_middleware(APIBoundaryMiddleware, settings=settings)
    hosts = ["localhost", "127.0.0.1", "[::1]"]
    if settings.environment == "test":
        hosts.append("testserver")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=hosts)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.frontend_origins),
        allow_origin_regex=TRYCLOUDFLARE_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )

    @app.exception_handler(APIError)
    async def api_error(_request: Request, error: APIError) -> JSONResponse:
        response = JSONResponse(
            status_code=error.status,
            content={"error": {"code": error.code, "message": error.message}},
        )
        if error.clear_cookie:
            clear_session_cookie(response, settings)
        if error.retry_after is not None:
            response.headers["Retry-After"] = str(error.retry_after)
        return response

    @app.exception_handler(SQLAlchemyError)
    async def database_error(_request: Request, _error: SQLAlchemyError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "database_unavailable", "message": "The service is temporarily unavailable."}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
        # FastAPI's default detail contains raw input, which may contain a password.
        fields = [
            {
                "field": (
                    item["loc"][-1]
                    if item["loc"] and item["loc"][-1] in {"email", "password"}
                    else "request"
                ),
                "code": item["type"],
            }
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Check the submitted fields. Use a valid email and a password of 8 to 128 characters.",
                    "fields": fields,
                }
            },
        )

    @app.get("/api/v1/health", tags=["system"])
    def health() -> dict[str, str]:
        database.verify()
        return {"status": "ok", "environment": settings.environment, "storage": "postgresql"}

    app.include_router(auth_router)
    app.include_router(onboarding_router)
    app.include_router(assessments_router)
    app.include_router(chats_router)
    return app

