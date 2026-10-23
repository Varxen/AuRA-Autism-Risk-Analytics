# AuRA (Autism Risk Analytics)

AuRA is an autism education and pre-screening frontend demonstration. The React, TypeScript and Vite application lives in `frontend/`. A separate FastAPI backend provides PostgreSQL-backed authentication and cookie sessions, now connected to the frontend. Onboarding/screening persistence, NLP and ML remain pending.

## Repository structure

```text
aura-thesis/
  frontend/
    src/                 React components, pages, state, types and services
    public/              Static assets and branding
    tests/               Unit and browser checks
    package.json         Frontend dependencies and scripts
    package-lock.json
    vite.config.ts
    tsconfig*.json
    eslint.config.js
    index.html
    README.md            Detailed frontend guide
    node_modules/        Local dependencies (ignored by Git)
    dist/                Production build (ignored by Git)
  backend/               FastAPI auth API, PostgreSQL models, migrations and tests
  docs/                  Roadmap, implementation notes and review captures
  documentation/         Supplied research and design references
  .gitignore
```

## Run the frontend

Use Node.js 22.18 or newer.

```sh
cd frontend
npm install
npm run dev
```

Run the backend first, then open the URL printed by Vite. Vite proxies `/api` to `127.0.0.1:8000`. On PowerShell installations with script restrictions, use `npm.cmd` instead of `npm`.

Run checks from `frontend/`:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Alternatively, run a frontend script from the repository root with `npm --prefix frontend run dev` or `npm --prefix frontend run build`.

The current authentication browser check requires Vite, the backend and Playwright Chromium. See [the frontend guide](frontend/README.md) for commands and environment options. Historical captures, when generated, go to `docs/design-review/`.

## Project documentation

- [Current roadmap](docs/roadmap.md)
- [Frontend implementation guide](frontend/README.md)
- [Frontend completion and validation notes](docs/frontend-completion.md)
- [frontend guide](frontend/README.md)
- [Database development blueprint](documentation/AuRA_Database_Development_Plan.md)

The frontend uses the real authentication API. Chat, assessment and onboarding remain in temporary memory. It does not persist screening records or provide a clinical risk classification.

## Backend authentication

See [backend setup](backend/README.md) and [the auth API contract](backend/docs/auth-api.md). The local aura_db database contains users and auth_sessions, managed by Alembic migrations. Credentials belong only in ignored backend/.env. Authentication does not yet persist onboarding or screening responses.

From backend/ after configuring PostgreSQL and installing dependencies:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn aura_api.main:create_app --factory --host 127.0.0.1 --port 8000 --reload --no-access-log
```
