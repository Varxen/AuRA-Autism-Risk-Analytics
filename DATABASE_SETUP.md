# Database Setup (PostgreSQL) — Step by Step

> Shortcut: `setup.ps1` does all of this automatically. Use this guide only if you want to do it by hand or `setup.ps1` failed.

## 1. Install PostgreSQL

1. Go to https://www.postgresql.org/download/windows/ and download the installer (version 17 or newer).
2. Run it. Click **Next** on every screen, with these exceptions:
   - **Password** screen: type a password for user `postgres`. **Write it down.**
   - **Port**: keep `5432`.
3. Finish the install. You can skip Stack Builder (untick it).

## 2. Create the database

Open **SQL Shell (psql)** from the Start menu. Press **Enter** four times (Server, Database, Port, Username keep defaults). Type your password from step 1.

Then type this and press Enter:

```sql
CREATE DATABASE aura_db;
```

You should see `CREATE DATABASE`. Type `\q` and press Enter to exit.

## 3. Install the backend packages

Open PowerShell in the project folder:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

(Needs Python 3.12 or newer from https://www.python.org/downloads/ — tick **Add python.exe to PATH** when installing.)

## 4. Set the password in `.env`

Still in `backend`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Change this line to your password from step 1, then save:

```text
AURA_DB_PASSWORD=your_password_here
```

Leave the other `AURA_DB_` lines as they are:

```text
AURA_DB_HOST=localhost
AURA_DB_PORT=5432
AURA_DB_NAME=aura_db
AURA_DB_USER=postgres
```

## 5. Create the tables (Alembic upgrade)

Still in `backend`:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Expected output ends with:

```text
Running upgrade ... -> 20261025_08 ...
```

This creates every table (users, sessions, onboarding, assessments, answers, chat history, model results).

## 6. Check it worked

```powershell
.\.venv\Scripts\python.exe -m alembic current
```

It must show the latest revision followed by `(head)`.

Optional: in SQL Shell, connect to the database and list tables:

```sql
\c aura_db
\dt
```

## Troubleshooting

| Error | Fix |
|---|---|
| `password authentication failed` | Wrong password in `backend/.env`. Fix `AURA_DB_PASSWORD`. |
| `connection refused` / `could not connect` | PostgreSQL service is off. Press Win+R, run `services.msc`, start **postgresql-x64-17**. |
| `database "aura_db" does not exist` | Redo step 2. |
| `alembic` not found | Use the full command `.\.venv\Scripts\python.exe -m alembic ...` from the `backend` folder. |
| Port 5432 already used | Another PostgreSQL is running. Use it, or change `AURA_DB_PORT` in `.env`. |

## Start the app

From the project root:

```powershell
.\start.ps1
```
