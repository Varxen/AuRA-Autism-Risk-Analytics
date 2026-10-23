# AuRA backend

FastAPI authentication API for parent/guardian accounts, backed by PostgreSQL. The selected login method is email + password with server-side opaque sessions in HttpOnly cookies.

All backend source, migrations, configuration and tests live here. The React frontend now calls these auth endpoints through the Vite `/api` proxy. Screening, onboarding persistence, NLP and ML endpoints are not implemented.

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
.\.venv\Scripts\python.exe -m uvicorn aura_api.main:create_app --factory --host 127.0.0.1 --port 8000 --reload --no-access-log
```

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

See [the HTTP contract](docs/auth-api.md). Authentication alone does not establish screening consent, age eligibility or completed onboarding. Client-supplied roles/consent/setup flags are rejected.

## Security and persistence

- Passwords: 15-128 characters; no composition rule or trimming; whitespace-only values rejected. Standard-library scrypt uses N=32768, r=8, p=3, a 16-byte random salt and a 64-byte derived key.
- Email: normalized ASCII mailbox with lowercase matching; ownership verification is not connected. Responses explicitly return `emailVerified: false`.
- `users` stores identity and password hashes. PostgreSQL enforces unique normalized email, including concurrent registrations.
- `auth_sessions` stores a SHA-256 token digest, account foreign key, CSRF value and timestamps. Raw authentication tokens are never stored in the database or returned in JSON.
- Cookies: host-only, Path=/, HttpOnly, SameSite=Lax. Local HTTP uses `aura_session`. Secure-cookie mode uses `__Host-aura_session` and requires HTTPS.
- Default expiry: eight hours absolute and thirty minutes idle. Successful session reads renew idle activity within the absolute limit. Login rotates the current browser token; logout revokes it server-side. Other browsers have independent sessions.
- Mutations require an exact trusted frontend Origin or validated API same-origin. Authenticated logout also requires X-CSRF-Token. CORS permits credentials only for explicit configured origins.
- JSON-only credential endpoints have a streamed 16 KiB body limit. Public validation/database errors do not echo credentials. Auth responses use no-store caching.
- Credential throttling is ten submissions/minute per direct client IP, shared by register/login. Forwarded IP headers are not trusted. A distributed limiter is pending for production.

Use matching hostnames for Vite and the API, for example both `127.0.0.1`, so cookie same-site rules work across ports. Never copy authentication tokens to localStorage/sessionStorage.

Accounts and unexpired sessions survive API restarts. A database outage returns safe errors rather than changing to mock authentication. Database backups and approved retention/deletion procedures remain deployment work. The local postgres administrator connection is for development; a limited application role is required before production.

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
$env:AURA_BACKEND_TEST_URL='http://127.0.0.1:8000'
node backend/tests/browser_auth.mjs
```

Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH when using an existing browser. This smoke check reuses frontend's existing Playwright dependency, creates a visibly fictional browser-test account, verifies cookies/CORS/CSRF and signs out.

## Structure

```text
aura_api/
  main.py          App factory and safe public errors
  config.py        Environment, PostgreSQL and session settings
  database.py      Engine, transactions and schema availability checks
  middleware.py    Origin, JSON/body-size and cache boundaries
  auth/
    routes.py      HTTP endpoints and cookies
    schemas.py     Request/public response models
    security.py    Password hashing and rate limits
    service.py     Credential/session lifecycle
    store.py       SQLAlchemy user/session models
migrations/        Alembic revisions
alembic.ini
tests/             PostgreSQL, migration and browser tests
docs/auth-api.md
```

Pending: server-owned onboarding/consent/eligibility, email verification/reset, screening/history persistence, production privacy/deletion policies, distributed throttling and production deployment. PostgreSQL currently stores authentication records only, not parent/child screening responses.
