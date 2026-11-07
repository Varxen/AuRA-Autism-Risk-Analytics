# AuRA backend

FastAPI authentication, onboarding and assessment API for parent/guardian accounts, backed by PostgreSQL. The selected login method is email + password with server-side opaque sessions in HttpOnly cookies.

All backend source, versioned questionnaire content, migrations, configuration and tests live here. The React frontend calls auth, onboarding and assessment endpoints through the Vite `/api` proxy. Assessment inference loads the saved machine-learning artifacts from `../machine-learning/artifacts/`.

## Setup and run

Use Python 3.12 or newer. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Skip Copy-Item when `.env` already exists. Set PostgreSQL connection details in `.env`; it is ignored by Git. Environment variables override file values. Separate DB fields handle passwords containing URL special characters without manual encoding.

```text
AURA_DB_HOST=localhost
AURA_DB_PORT=5432
AURA_DB_NAME=aura_db
AURA_DB_USER=your_local_database_user
AURA_DB_PASSWORD=your_local_password
```

Create the empty database first, then run the versioned migration:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn aura_api.main:create_app --factory --host 127.0.0.1 --port 8001 --reload --no-access-log
```

Parent follow-up text is saved as typed. No language model reviews it, and any non-empty response is accepted. Only the educational chat intent check still uses local Ollama at `http://127.0.0.1:11434`.

Linux/macOS uses `.venv/bin/python`. Health is `/api/v1/health`; interactive OpenAPI is `/docs`.

Startup verifies PostgreSQL and required tables. It does not create tables automatically or fall back to temporary memory. Production mode remains blocked pending deployment/privacy requirements. Use one worker while request throttling is process-local. The connection pool uses five persistent slots with up to five overflow connections.

## Implemented endpoints

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/v1/health` | Verify database/schema availability |
| POST | `/api/v1/auth/register` | Validate credentials, hash password, create user/session transactionally |
| POST | `/api/v1/auth/login` | Verify credentials and rotate current browser session |
| GET | `/api/v1/auth/session` | Restore identity, CSRF value and session expiry |
| POST | `/api/v1/auth/logout` | Validate CSRF, revoke the database session and clear its cookie |
| DELETE | `/api/v1/auth/account` | Require current password and CSRF, delete account-linked records, and clear the session cookie |
| GET | `/api/v1/onboarding` | Load authenticated account's persisted onboarding state |
| POST | `/api/v1/onboarding/about` | Record review of pre-assessment information |
| POST | `/api/v1/onboarding/consent` | Record acceptance of the server-versioned demonstration notice |
| PUT | `/api/v1/onboarding/eligibility` | Validate and save guardian relationship, regular interaction and age (12-36 months) |
| POST | `/api/v1/onboarding/complete` | Complete setup only after server-validated consent and eligibility |
| GET | `/api/v1/assessments` | List only the signed-in user's saved sessions and answer history |
| POST | `/api/v1/assessments` | Start versioned English/Filipino session after current consent and eligibility |
| GET | `/api/v1/assessments/{id}` | Restore a saved session and its immutable questionnaire wording snapshot |
| PUT | `/api/v1/assessments/{id}/answers/{question_id}` | Check the structured option against its follow-up with pipeline stage 2.3; save both only when consistent, otherwise request both again |
| POST | `/api/v1/assessments/{id}/advance` | Enforce the answer/follow-up sequence and progress or complete the session |
| POST | `/api/v1/assessments/{id}/processing` | Classify the accepted 13-value vector with equal-weight soft voting, then generate a bounded explanation from the result |
| GET | `/api/v1/assessments/{id}/processing` | Read the persisted classification, explanation and job status |
| POST | `/api/v1/assessments/{id}/processing/retry` | Retry a failed model inference |
| DELETE | `/api/v1/assessments/{id}` | Permanently delete only the owner's assessment and answer rows |
| GET | `/api/v1/chats` | List only the signed-in user's chat transcripts |
| POST | `/api/v1/chats` | Create a saved chat with AuRA's initial greeting and actions |
| GET | `/api/v1/chats/{id}` | Restore an owned transcript in message order |
| POST | `/api/v1/chats/{id}/turns` | Atomically save a user message and its fixed assistant replies |
| DELETE | `/api/v1/chats/{id}` | Permanently delete only the owner's chat and messages |

See [the HTTP contract](docs/auth-api.md). Authentication alone does not establish screening consent, age eligibility or completed onboarding. Consent version, scope, acceptance time, eligibility, and setup completion are stored in a user-owned record. The server enforces step order and current consent version; client-supplied setup flags are rejected.

## Security and persistence

- Passwords: 8-128 characters; no composition rule or trimming; whitespace-only values rejected. Standard-library scrypt uses N=32768, r=8, p=3, a 16-byte random salt and a 64-byte derived key.
- Email: normalized ASCII mailbox with lowercase matching; ownership verification is not connected. Responses explicitly return `emailVerified: false`.
- `users` stores identity and password hashes. PostgreSQL enforces unique normalized email, including concurrent registrations.
- `onboarding_records` has one account-owned row for pre-assessment acknowledgement, consent evidence, minimal eligibility fields, and completion time. It stores no child name. Deleting the account cascades to this record.
- `assessment_sessions` stores owner, language, questionnaire version, progress, timestamps, legacy preview marker and full wording/options snapshot. `assessment_answers` stores one server-scored selected option and verbatim follow-up per item. `assessment_processing_jobs` stores status, retry attempt and the score-derived model category/probabilities with the Phase 4 explanation, category-based recommendation and influential-indicator details; assessment deletion cascades to all three.
- `chat_conversations` stores account-owned chats. `chat_messages` stores ordered user/assistant messages, fixed action buttons, knowledge sources and timestamps. Ownership is checked on reads and mutations; deleting a chat cascades to its messages.
- `auth_sessions` stores a SHA-256 token digest, account foreign key, CSRF value and timestamps. Raw authentication tokens are never stored in the database or returned in JSON.
- Cookies: host-only, Path=/, HttpOnly, SameSite=Lax. Local HTTP uses `aura_session`. Secure-cookie mode uses `__Host-aura_session` and requires HTTPS.
- Default expiry: eight hours absolute and thirty minutes idle. Successful session reads renew idle activity within the absolute limit. Login rotates the current browser token; logout revokes it server-side. Other browsers have independent sessions.
- Mutations require an exact trusted frontend Origin or validated API same-origin. Authenticated logout also requires X-CSRF-Token. CORS permits credentials only for explicit configured origins.
- JSON-only credential endpoints have a streamed 16 KiB body limit. Public validation/database errors do not echo credentials. Auth responses use no-store caching.
- Credential throttling is ten submissions/minute per direct client IP, shared by register/login. Forwarded IP headers are not trusted. A distributed limiter is pending for production.

Use matching hostnames for Vite and the API, for example both `127.0.0.1`, so cookie same-site rules work across ports. Never copy authentication tokens to localStorage/sessionStorage.

Accounts, onboarding state, chats, assessments, answers, model results and unexpired sessions survive API restarts. Processing loads the three saved Stage 3.1 artifacts and applies the Stage 3.2 equal-weight mean of class probabilities. Phase 4 compares each answer with a Sometimes reference while holding the other answers fixed, maps the five largest support shifts to approved indicator labels and selected answers, and attaches fixed localized explanation text. A fixed recommendation is selected by category. The result also returns each saved follow-up answer under its behavioral indicator (`indicatorResponses`) for display only. Accepted structured scores are the only classifier features; follow-up text remains stored but is not sent to the classifier. Low/Moderate/High labels and probabilities are score-derived and are not ASD-risk estimates or diagnoses. Install backend model dependencies and run `python -m alembic upgrade head` after pulling this change. Account-linked application data is retained while the account is active. Account deletion from Settings requires password re-entry and cascades through onboarding, chats, assessments, answers, model results and sessions. Backup retention and deletion are not configured. Use fictional child information. The local postgres administrator connection is for development; a limited application role and reviewed privacy/deletion procedures are required before production.

## Checks

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m compileall -q aura_api migrations tests
```

Tests use real PostgreSQL in disposable UUID-named schemas within the configured database. They create/drop only their own `aura_test_*` schemas, leaving public application records alone. The test connection needs schema-creation privileges. Migration rollback is exercised only inside these disposable schemas; an application downgrade would delete auth tables and needs an explicit backup/recovery plan.

With Vite and Uvicorn running, run from repository root:

```powershell
$env:AURA_TEST_URL='http://127.0.0.1:5173'
$env:AURA_BACKEND_TEST_URL='http://127.0.0.1:8001'
node backend/tests/browser_auth.mjs
```

Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH when using an existing browser. This smoke check reuses frontend's existing Playwright dependency, creates a visibly fictional browser-test account, verifies cookies/CORS/CSRF and signs out.

## Structure

```text
aura_api/
  main.py          App factory and safe public errors
  onboarding.py    Account-owned onboarding and consent API
  assessments.py   Owned assessment storage, sequence validation and History API
  questionnaire.py Server-owned bilingual wording, versions and scoring
  config.py        Environment, PostgreSQL and session settings
  database.py      Engine, transactions and schema availability checks
  middleware.py    Origin, JSON/body-size and cache boundaries
  auth/
    routes.py      HTTP endpoints and cookies
    schemas.py     Request/public response models
    security.py    Password hashing and rate limits
    service.py     Credential/session lifecycle
    store.py       SQLAlchemy account/session/onboarding/assessment models
migrations/        Alembic revisions 20261023_01 through 20261025_05
alembic.ini
tests/             PostgreSQL, migration and browser tests
docs/auth-api.md
```

Pending: reviewed Phase 4 wording and attribution quality, email verification/reset, approved production privacy policy, backup retention/deletion, distributed throttling and production deployment. Account deletion is self-service; PostgreSQL cascades it through linked application records. PostgreSQL stores account-owned chat transcripts, assessment answers and provisional model classifications. Apply the latest Alembic migration before starting the backend.
