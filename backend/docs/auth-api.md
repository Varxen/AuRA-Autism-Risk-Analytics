# AuRA authentication contract

Implemented: email/password authentication with PostgreSQL-backed opaque cookie sessions. Base path: `/api/v1/auth`. Public JSON uses camelCase. The React development frontend calls this API through Vite's same-origin `/api` proxy.

## Register or login

POST `/register` returns 201. POST `/login` returns 200. Send application/json and exactly these fields:

```json
{
  "email": "parent@example.test",
  "password": "fictional parent password 123"
}
```

Email uses normalized lowercase ASCII matching. Passwords retain entered whitespace and must have 15-128 characters; blank-only passwords are rejected. Extra fields such as role, consent or onboardingComplete are rejected.

Both actions set an HttpOnly session cookie and return:

```json
{
  "user": {
    "id": "00000000-0000-4000-8000-000000000001",
    "email": "parent@example.test",
    "role": "parent_guardian",
    "emailVerified": false,
    "createdAt": "2026-10-23T00:00:00Z"
  },
  "csrfToken": "<session-bound CSRF value>",
  "expiresAt": "2026-10-23T08:00:00Z",
  "idleExpiresAt": "2026-10-23T00:30:00Z"
}
```

Values above are illustrative. The raw authentication token appears only in Set-Cookie. The role identifies account purpose; it does not certify guardian eligibility, approved consent or completed onboarding. Email ownership is not verified yet.

Registration and initial-session creation are transactional. Unique normalized email is enforced by PostgreSQL. Duplicate registration returns generic 409. Login returns identical generic 401 for unknown email/wrong password, and does not terminate an existing valid session on a failed attempt. Successful login rotates only this browser's previous session and CSRF value.

## Restore

GET `/session` returns the same shape for the cookie's identity. Client-supplied user IDs cannot select another account. Missing, malformed, expired or revoked sessions return 401 and clear the cookie.

Successful reads refresh idle activity within the absolute expiry. PostgreSQL records survive API restarts, so unexpired cookies can restore the session after a restart. A database outage produces safe 503 responses; there is no in-memory fallback. Startup requires the migration to have been applied.

## Logout

POST `/logout` returns 204, revokes the database session and clears its cookie. For an active session, send X-CSRF-Token from the current session response. Missing/wrong active-session CSRF returns 403 without revocation. Logout with no valid session is idempotent and can clear the cookie without a CSRF value.

Mutations require an exact configured frontend Origin or the API's own origin after trusted-host checks. Missing/null/untrusted Origin is rejected. Browser fetch supplies Origin; command-line clients must set it explicitly. Swagger's same-origin UI can also exercise the endpoints.

## Error contract

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid email or password."
  }
}
```

| Status | Meaning |
|---|---|
| 401 | Invalid credentials or missing/expired/revoked session |
| 403 | Missing/untrusted Origin or invalid CSRF |
| 409 | Account registration unavailable |
| 413 | Request body exceeds 16 KiB |
| 415 | Credential payload is not JSON |
| 422 | Missing/invalid/extra fields or malformed JSON |
| 429 | Credential rate limit; respect Retry-After |
| 503 | Database service unavailable |

422 responses add safe field/code pairs and omit raw submitted input. Credential/session responses use Cache-Control: no-store. Do not log request credentials, cookies or CSRF values.

## Frontend integration

The React client uses credentials: include for register, login, session restore and logout. Vite proxies `/api` to the local backend on port 8000. A production host will need equivalent routing. The CSRF value stays in React memory and is obtained again through GET /session after refresh. Authentication tokens are never copied to localStorage/sessionStorage or URLs.

Frontend sign out calls backend logout and clears temporary onboarding, chat and assessment state. Registration/login use actual backend identity. Onboarding currently has no server-owned status, so a successful login or restored session starts an incomplete in-memory setup. Refreshing resets that setup and screening history. Backend onboarding and consent endpoints are needed before returning users can resume validated setup across refreshes.

PostgreSQL currently stores users and authentication sessions only. Screening responses, onboarding evidence, email verification/reset, approved policies and production deployment remain separate work. See [backend setup](../README.md).
