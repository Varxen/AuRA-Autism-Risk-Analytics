from fastapi import APIRouter, Depends, Header, Request, Response

from .schemas import Credentials, DeleteAccountInput, SessionResponse
from .service import AuthService
from ..config import Settings

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


def service(request: Request) -> AuthService:
    return request.app.state.auth


def limit_credentials(request: Request) -> None:
    request.app.state.auth_limiter.check(request.client.host if request.client else "unknown")


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        settings.cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def session_response(
    request: Request,
    response: Response,
    auth: AuthService,
    credentials: Credentials,
    *,
    register: bool,
) -> SessionResponse:
    settings = request.app.state.settings
    action = auth.register if register else auth.login
    token, session = action(
        credentials.email,
        credentials.password.get_secret_value(),
        request.cookies.get(settings.cookie_name),
    )
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_ttl_seconds,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return auth.response(session)


@router.post(
    "/register",
    status_code=201,
    response_model=SessionResponse,
    dependencies=[Depends(limit_credentials)],
)
def register(
    credentials: Credentials,
    request: Request,
    response: Response,
    auth: AuthService = Depends(service),
) -> SessionResponse:
    return session_response(request, response, auth, credentials, register=True)


@router.post("/login", response_model=SessionResponse, dependencies=[Depends(limit_credentials)])
def login(
    credentials: Credentials,
    request: Request,
    response: Response,
    auth: AuthService = Depends(service),
) -> SessionResponse:
    return session_response(request, response, auth, credentials, register=False)


@router.get("/session", response_model=SessionResponse)
def current_session(request: Request, auth: AuthService = Depends(service)) -> SessionResponse:
    token = request.cookies.get(request.app.state.settings.cookie_name)
    return auth.response(auth.require_session(token))


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    auth: AuthService = Depends(service),
    csrf_token: str | None = Header(
        default=None,
        alias="X-CSRF-Token",
        max_length=128,
        description="Required for an active session. Use csrfToken from the session response.",
    ),
) -> Response:
    settings = request.app.state.settings
    auth.logout(request.cookies.get(settings.cookie_name), csrf_token)
    response = Response(status_code=204)
    clear_session_cookie(response, settings)
    return response


@router.delete("/account", status_code=204, dependencies=[Depends(limit_credentials)])
def delete_account(
    credentials: DeleteAccountInput,
    request: Request,
    csrf_token: str | None = Header(default=None, alias="X-CSRF-Token", max_length=128),
    auth: AuthService = Depends(service),
) -> Response:
    settings = request.app.state.settings
    auth.delete_account(
        request.cookies.get(settings.cookie_name),
        credentials.password.get_secret_value(),
        csrf_token,
    )
    response = Response(status_code=204)
    clear_session_cookie(response, settings)
    return response
