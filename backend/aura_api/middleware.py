"""Browser origin, JSON/body-size and response-cache boundaries for the API."""

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import Settings


class APIBoundaryMiddleware:
    MAX_BODY_BYTES = 65_536
    MAX_CREDENTIAL_BODY_BYTES = 16_384

    def __init__(self, app: ASGIApp, settings: Settings):
        self.app = app
        self.settings = settings

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope["path"].startswith("/api/v1/"):
            await self.app(scope, receive, send)
            return

        async def secure_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store"
                headers["Pragma"] = "no-cache"
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
            await send(message)

        async def reject(status: int, code: str, message: str) -> None:
            response = JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})
            await response(scope, receive, secure_send)

        if scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            await self.app(scope, receive, secure_send)
            return
        headers = Headers(scope=scope)
        origin = headers.get("origin")
        same_origin = f"{scope['scheme']}://{headers.get('host', '')}"
        if not self.settings.allows_frontend_origin(origin) and origin != same_origin:
            await reject(403, "untrusted_origin", "Use an allowed application origin.")
            return
        credential_path = scope["path"] in {
            "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/account"
        }
        max_body_bytes = self.MAX_CREDENTIAL_BODY_BYTES if credential_path else self.MAX_BODY_BYTES
        content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if credential_path and content_type != "application/json":
            await reject(415, "json_required", "Send credentials as application/json.")
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > max_body_bytes:
                await reject(413, "request_too_large", "The request body is too large.")
                return
            body.extend(chunk)
            if not message.get("more_body", False):
                break
        delivered = False

        async def replay_receive() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay_receive, secure_send)
