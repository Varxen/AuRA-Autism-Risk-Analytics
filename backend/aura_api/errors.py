"""Public API errors never include submitted credentials or session tokens."""


class APIError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        *,
        clear_cookie: bool = False,
        retry_after: int | None = None,
    ):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.clear_cookie = clear_cookie
        self.retry_after = retry_after
