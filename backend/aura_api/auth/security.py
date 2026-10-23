"""Standard-library scrypt password hashes and bounded process-local throttling."""

from collections import deque
import hashlib
import math
import secrets
from threading import Lock
from time import monotonic

from ..errors import APIError

SCRYPT_N = 32_768
SCRYPT_R = 8
SCRYPT_P = 3


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R,
        p=SCRYPT_P, dklen=64, maxmem=64 * 1024 * 1024,
    )
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        kind, n, r, p, salt, expected = encoded.split("$")
        if (kind, n, r, p) != ("scrypt", str(SCRYPT_N), str(SCRYPT_R), str(SCRYPT_P)):
            return False
        salt_bytes, expected_bytes = bytes.fromhex(salt), bytes.fromhex(expected)
        if len(salt_bytes) != 16 or len(expected_bytes) != 64:
            return False
        actual = hashlib.scrypt(
            password.encode("utf-8"), salt=salt_bytes, n=SCRYPT_N, r=SCRYPT_R,
            p=SCRYPT_P, dklen=64, maxmem=64 * 1024 * 1024,
        )
        return secrets.compare_digest(actual, expected_bytes)
    except (ValueError, TypeError):
        return False


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthRateLimiter:
    """Per-client-IP limit; forwarded headers are deliberately not trusted."""

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, client_ip: str) -> None:
        now = monotonic()
        with self._lock:
            for key in list(self._events):
                events = self._events[key]
                while events and events[0] <= now - self.window:
                    events.popleft()
                if not events:
                    del self._events[key]
            if client_ip not in self._events and len(self._events) >= 4096:
                raise APIError(
                    429, "rate_limited", "Too many authentication requests. Try again later.",
                    retry_after=self.window,
                )
            events = self._events.setdefault(client_ip, deque())
            if len(events) >= self.limit:
                retry = max(1, math.ceil(self.window - (now - events[0])))
                raise APIError(
                    429, "rate_limited", "Too many authentication requests. Try again later.",
                    retry_after=retry,
                )
            events.append(now)
