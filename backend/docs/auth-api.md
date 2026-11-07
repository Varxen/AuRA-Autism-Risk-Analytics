# AuRA authentication, onboarding and assessment contract

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

## Delete account

DELETE `/account` requires the active HttpOnly session cookie, the current `X-CSRF-Token`, and an application/json body containing the account password. The server verifies the session, CSRF token and password inside a transaction, then deletes the user record. PostgreSQL cascades deletion through sessions, onboarding/consent, chats/messages, assessments/answers and processing results. Success returns 204 and clears the session cookie. Wrong password returns 403 without deleting data. The frontend exposes this through Settings > Delete account; backups are outside the current application database deletion flow and have no defined retention schedule.

## Onboarding

Base path: `/api/v1/onboarding`. Every endpoint requires the HttpOnly session cookie. The server derives account ownership from that session; requests cannot supply a user ID, consent version, consent timestamp, eligibility flag, or completion flag.

| Method and path | Behavior |
|---|---|
| GET `/` | Load account's state; creates an empty record on first load |
| POST `/about` | Acknowledge the About Pre-assessment screen |
| POST `/consent` | Record acceptance after About; server sets version, scope, and UTC time |
| PUT `/eligibility` | Save relationship, regular interaction and age after accepted consent |
| POST `/complete` | Mark setup complete only when all server checks pass |

Responses include `requiredStep`: `about`, `consent`, `parent-child`, `complete`, or `null`. The current notice version is `aura-chat-assessment-storage-v1`, scope is `chat-assessment-storage-demo`. The server checks sequence, age 12-36 months, allowed guardian relationship, regular interaction, and accepted current consent. Each write locks the account's onboarding row. A stale or out-of-order request returns 409. Invalid fields return 422.

Persisted onboarding fields are guardian relationship, regular interaction, child age in months, About acknowledgement, consent version/scope/time and completion time. No child name is collected. This is a demonstration consent record, not an approved production Privacy Policy or research consent.

## Assessments

Base path: `/api/v1/assessments`. Every request requires the HttpOnly session cookie. Reads and writes scope by the session's user ID. Creating a session requires completed current-version onboarding consent and eligibility.

| Method and path | Behavior |
|---|---|
| GET `/` | List only this account's sessions, answer records and question snapshots |
| POST `/` | Create a session using approved version `revised-pilot-testing-2-v1` and language `en` or `fil` |
| GET `/{id}` | Restore the owned session and its immutable wording snapshot |
| PUT `/{id}/answers/{question_id}` | Submit a choice; score 0 saves without follow-up, while scores 1 and 2 require Stage 2.3 acceptance |
| POST `/{id}/advance` | Require saved score-0 answer or accepted score-1/2 answer with follow-up; complete after item 13 |
| POST `/{id}/processing` | Run the saved ensemble, estimate one-at-a-time indicator support changes against a Sometimes reference, generate an explanation and fixed category-based recommendation; requires all 13 answers and required follow-ups |
| GET `/{id}/processing` | Read persisted model status, category, support values and optional explanation |
| POST `/{id}/processing/retry` | Retry failed model inference |
| DELETE `/{id}` | Permanently delete only the owned session and its answers |

The server validates item ID, option ID, sequence and 4,000-character follow-up limit. Score 0 advances without follow-up; scores 1 and 2 require one. Any non-empty follow-up is accepted and stored unchanged; no language model or keyword check reviews it. Scoring is Q1-Q9 Always/Sometimes/Never = 0/1/2 and Q10-Q13 Yes/Sometimes/No = 2/1/0. The server stores the selected option, calculated item score and unmodified accepted parent text. It never accepts a client-supplied score. Identical writes are safe; conflicting changes return 409. A response lost after a committed write can be recovered with GET `/{id}`.

Each session stores language, questionnaire version and full question/option snapshot. PostgreSQL keeps the session, answers and snapshots until the user deletes the assessment in History. Accepted structured scores form the only model feature vector; parent follow-up text is stored unchanged but is not sent to these models. Processing loads the three saved Stage 3.1 artifacts and applies Stage 3.2 equal-weight soft voting. Jobs persist the category, model support values, model version, generation time, per-indicator support changes, associated selected answers, Phase 4 explanation and fixed category-based recommendation. The explanation is deterministic localized text. Results also return `indicatorResponses`: every behavioral indicator with the selected answer and the parent's saved follow-up answer, read from the stored answers at request time. Low/Moderate/High are provisional score-derived categories, not ASD probabilities or a diagnosis. Legacy preview records remain ineligible. Processing results and answers are deleted with their assessment. Model dependencies and artifacts must exist in the backend runtime; failed inference can be retried.

## Information chats

Base path: `/api/v1/chats`. Requests require an authenticated session and current onboarding storage consent for writes. All reads, writes and deletes are scoped to the signed-in account.

| Method and path | Behavior |
|---|---|
| GET `/` | List this account's chat transcripts for History |
| POST `/` | Create a chat with the fixed AuRA welcome message and actions |
| GET `/{id}` | Restore the owned transcript in sequence order |
| POST `/{id}/turns` | Save one parent message and its fixed knowledge-base reply messages atomically |
| DELETE `/{id}` | Permanently delete the owned conversation and all its messages |

Chat writes accept 1-2 assistant reply messages per turn, enforce the 4,000-character message limit, and use a client turn ID for safe retry. A conflicting replay returns 409. Conversation history is capped at 500 messages; start a new chat to continue after the cap. The frontend's fixed local knowledge-base adapter still selects educational replies; this API stores and restores them but does not run NLP or generate answers.

PostgreSQL retains chats and assessments until deleted in History or the account is deleted. Account-linked application records can be removed in Settings after password confirmation. No automatic expiry or backup retention is configured. The development privacy notice covers chat storage and requires users to use fictional child details.

The development privacy notice describes stored fields, purpose, local database access, retention and deletion. Assessment and account deletion are self-service; backup retention is undefined. The notice is a development draft, not legally or clinically approved policy. Use fictional child information.

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
| 409 | Duplicate registration, invalid onboarding step, or assessment state conflict |
| 413 | Request body exceeds the endpoint limit (16 KiB for credential endpoints; 64 KiB elsewhere) |
| 415 | Credential payload is not JSON |
| 422 | Missing/invalid/extra fields or malformed JSON |
| 429 | Credential rate limit; respect Retry-After |
| 503 | Database service unavailable |

422 responses add safe field/code pairs and omit raw submitted input. Credential/session responses use Cache-Control: no-store. Do not log request credentials, cookies or CSRF values.

## Frontend integration

The React client uses credentials: include for register, login, session restore, onboarding, assessments and logout. Vite proxies `/api` to the local backend on port 8001. A production host will need equivalent routing. The CSRF value stays in React memory and is obtained again through GET /session after refresh. Authentication tokens are never copied to localStorage/sessionStorage or URLs.

Frontend sign out calls backend logout and clears client-side cache. Registration/login use actual backend identity. Onboarding, chat transcripts, assessment sessions and model-processing results load from PostgreSQL, so progress survives refresh and backend restarts. Inference runs synchronously in the API request; no background worker is configured.

PostgreSQL stores users, authentication sessions, onboarding evidence, chat transcripts, assessment sessions, answer History and model results. NLP follow-up interpretation, email verification/reset, approved production policies and deployment remain separate work. See [backend setup](../README.md).
