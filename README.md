# Fitness Workout Logger

> **Every workout counts.** A calm, beginner-friendly fitness journal: log workouts, look back on your history and watch your consistency grow — *your progress, your pace.*

Project #101 · Category: Social Impact · Level: Basic · Stack: React + TypeScript + Django REST Framework

---

## Contents

1. [Problem statement](#problem-statement)
2. [Features](#features)
3. [Technology stack](#technology-stack)
4. [Architecture](#architecture)
5. [Project structure](#project-structure)
6. [Getting started](#getting-started)
7. [Environment variables](#environment-variables)
8. [Testing](#testing)
9. [API overview](#api-overview)
10. [Deployment](#deployment)
11. [Known limitations](#known-limitations)
12. [Future improvements](#future-improvements)

Further documentation:

- [docs/ENGINEERING.md](docs/ENGINEERING.md) covers requirements, user stories, the ER and use-case diagrams, key decisions, and the testing strategy.
- [docs/API.md](docs/API.md) is the full API reference.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) is the production guide.

## Problem statement

Many people start a fitness routine and lose track of it. They rely on memory, notebooks or apps built for competitive athletes. As a result, they can't easily tell how often they exercise, what they did, or whether they're becoming more consistent. Fitness Workout Logger gives them one simple, private place to record workouts and see real progress, without social comparison.

## Features

| Area | What you can do |
|---|---|
| **Accounts** | Register (signed in automatically), log in with username *or* email, log out, edit display name / username / email |
| **Exercise library** | 29 built-in exercises across Strength, Bodyweight, Cardio, Flexibility and Mobility; search and filter by category; add your own custom exercises (private to you) |
| **Workout logging** | Title, date, optional duration and notes; any number of exercises; the inputs adapt to the exercise's measurement type (sets × reps, sets × reps + kg, minutes, or km + optional minutes); add, remove, copy and reorder sets and exercises |
| **History** | Reverse-chronological list with pagination; search by title; filter by category and date range; view details, edit, or delete (with confirmation) |
| **Dashboard** | Real statistics: total workouts, this week, time trained, exercises logged, last 7 days chart, weekly goal progress, goal streak, recent workouts |
| **Progress** | Current-week chart (Mon–Sun), workouts per week over 4/8/12 weeks against your goal, category breakdown, most frequent exercises |
| **Goals** | Choose a weekly target (1–14 workouts) |
| **Quality** | Validation on both client and server, atomic saves, ownership checks, clear loading/empty/error states, accessible dialogs and forms, mobile-first layout |

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19, TypeScript, Vite 6 | Fast dev loop, strong typing |
| Styling | Tailwind CSS 4 with `@theme` design tokens | The Active Elegance palette lives in one place ([`index.css`](frontend/src/index.css)) |
| Routing | React Router 7 | Declarative routes plus auth guards |
| Charts / icons | Recharts 2, Lucide React | Accessible, themeable |
| Font | DM Sans (self-hosted via Fontsource) | No third-party font requests |
| Backend | Python 3.12, Django 5.2 LTS, Django REST Framework 3.16 | Proven auth, ORM, migrations, admin |
| Database | SQLite (dev) / PostgreSQL (prod) via `DATABASE_URL` | Zero-setup locally, robust in production |
| Static/SPA hosting | WhiteNoise | Django serves the built SPA from the same origin |
| Tests | Django test runner (67 tests), Vitest + React Testing Library (40 tests) | |

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>React SPA] -- "/api/* JSON<br/>session cookie + X-CSRFToken" --> D[Django + DRF]
  D --> DB[(SQLite / PostgreSQL)]
  subgraph Same origin
    B
    D
  end
```

- **Same-origin session authentication.** In development the Vite dev server proxies `/api` to Django. In production Django serves the built SPA itself. The browser therefore talks to a single origin, which allows an `HttpOnly` session cookie with CSRF protection, no CORS, and no tokens in `localStorage`. See [Engineering decisions](docs/ENGINEERING.md#key-engineering-decisions).
- **Thin client, authoritative server.** The frontend validates for usability. The backend enforces every business rule and every ownership check.
- **Atomic nested writes.** A workout, its entries and their sets are saved in one database transaction.

## Project structure

```text
fitness_logger/
├── backend/
│   ├── config/              settings/{base,development,production}.py, urls.py, wsgi.py
│   ├── accounts/            auth backend, register/login/logout/me, weekly goal (UserGoal)
│   ├── exercises/           Exercise model, seed data, library & custom-exercise API
│   ├── workouts/            Workout/WorkoutEntry/ExerciseSet, nested serializers,
│   │   ├── analytics.py     dashboard & progress calculations
│   │   └── management/      seed_demo command
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             fetch client (CSRF, errors) + typed endpoints
│   │   ├── components/      ui/ (design system), workouts/, charts/
│   │   ├── contexts/        AuthContext, ToastContext
│   │   ├── hooks/           useApi, useDeleteWorkout
│   │   ├── layouts/         AppLayout (sidebar + bottom nav), AuthLayout, guards
│   │   ├── pages/           auth/, dashboard/, workouts/, exercises/, progress/, profile/
│   │   ├── types/           API types
│   │   ├── utils/           formatting, workout-form state & validation
│   │   └── __tests__/       component tests
│   └── vite.config.ts
└── docs/                    ENGINEERING.md, API.md, DEPLOYMENT.md
```

## Getting started

**Prerequisites:** Python 3.12+, Node.js 20+ (tested with 22), npm.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate              # creates db.sqlite3 and seeds the exercise library
python manage.py runserver            # http://127.0.0.1:8000
```

Optional extras:

```powershell
python manage.py seed_demo            # demo account "demo" / "demo-pass-2026" with ~8 weeks of workouts (DEBUG only)
python manage.py createsuperuser      # for the Django admin at /admin/
python manage.py seed_exercises       # re-add any missing built-in exercises (idempotent)
```

### 2. Frontend (in a second terminal)

```powershell
cd frontend
npm install
npm run dev                           # http://localhost:5173  (proxies /api to :8000)
```

Open **http://localhost:5173**. Always use the Vite URL during development, because the session cookie belongs to that origin.

**Registration behaviour:** a successful registration signs the user in immediately and opens the dashboard.

## Environment variables

Backend settings are read from the environment, or from `backend/.env` if it exists (see [`backend/.env.example`](backend/.env.example)). Never commit `.env`.

| Variable | Used in | Default | Purpose |
|---|---|---|---|
| `DJANGO_SETTINGS_MODULE` | all | `config.settings.development` (`manage.py`), `config.settings.production` (`wsgi.py`) | Selects settings |
| `DJANGO_SECRET_KEY` | prod (required) | dev-only fallback | Cryptographic signing |
| `DJANGO_ALLOWED_HOSTS` | prod (required) | `localhost,127.0.0.1,…` | Host header allow-list |
| `DATABASE_URL` | prod (required) | SQLite in dev | e.g. `postgres://user:pass@host:5432/db` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | optional | `http://localhost:5173` in dev | Origins allowed to POST |
| `DJANGO_SECURE_SSL_REDIRECT` | prod | `true` | Redirect HTTP→HTTPS |
| `DJANGO_HSTS_SECONDS` | prod | `2592000` | HSTS max-age |
| `DJANGO_TIME_ZONE` | optional | `UTC` | Server time zone (fallback "today") |
| `VITE_BACKEND_URL` | frontend dev | `http://127.0.0.1:8000` | Where the Vite proxy forwards `/api` |

**Database setup:** SQLite needs no setup. For PostgreSQL, create a database and set `DATABASE_URL`, then run `python manage.py migrate`.

## Testing

```powershell
# Backend: 67 tests (auth, CSRF, CRUD, validation, ownership, transactions, statistics)
cd backend
python manage.py test

# Frontend: 40 tests (forms, validation, workout builder, history, dialogs, dashboard, API client)
cd frontend
npm test

# Type-check and production build
npm run build
```

The [testing strategy](docs/ENGINEERING.md#testing-strategy) lists what each test covers and how the five end-to-end user flows were verified.

## API overview

All endpoints are under `/api/` and return JSON. Every endpoint except register, login, logout and csrf requires a session.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/csrf/` | Sets the CSRF cookie |
| POST | `/api/auth/register/` | Create an account (and sign in) |
| POST | `/api/auth/login/` | Sign in with `identifier` (username or email) and `password` |
| POST | `/api/auth/logout/` | Sign out |
| GET, PATCH | `/api/auth/me/` | Current user profile |
| GET, PATCH | `/api/goals/` | Weekly workout target |
| GET, POST | `/api/exercises/` | Library (`?category=&search=`) and creating custom exercises |
| GET, PATCH, DELETE | `/api/exercises/{id}/` | Custom exercises (owner only) |
| GET, POST | `/api/workouts/` | History (`?page=&search=&category=&date_from=&date_to=`) and creating workouts |
| GET, PATCH, DELETE | `/api/workouts/{id}/` | Workout detail, update, delete |
| GET | `/api/dashboard/summary/` | Dashboard statistics |
| GET | `/api/progress/weekly/` | Current Monday–Sunday week, per day |
| GET | `/api/progress/trends/?weeks=8` | Per-week totals, categories, top exercises |

Request and response examples are in [docs/API.md](docs/API.md).

## Deployment

The recommended setup is a **single origin**: build the React app, and Django + WhiteNoise serves it together with the API (on Render, Railway, Fly.io or a VPS) on managed PostgreSQL. Step-by-step instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Screenshots

Run `python manage.py seed_demo`, then sign in as `demo` to see the dashboard and progress pages with realistic data. Screenshots can be added to `docs/screenshots/`.

## Known limitations

- **No password reset or email verification.** Neither is implemented, so the login page has no "Forgot password" link.
- **Light theme only.** Dark mode was a secondary feature and was deliberately left out.
- **Workout edits replace all entries.** Editing a workout rewrites its entries and sets in one transaction, so entry and set IDs change after an edit. Nothing depends on those IDs.
- **No unsaved-changes guard.** Navigating away from the workout form without saving discards the draft.
- **Weekly goal is not versioned.** The goal streak judges past weeks against the *current* target.
- **Single unit system.** The app uses kilograms, minutes and kilometres; there are no imperial units.
- **Single-user experience.** There is no admin dashboard beyond Django's built-in admin.
- **No browser-level E2E suite.** The five user flows were verified manually in a browser, not with an automated tool such as Playwright.

## Future improvements

- Password reset via email, and account deletion and data export
- Dark theme (the tokens are already centralised in `index.css`)
- Personal records and per-exercise progress charts (for example, best weight on bench press)
- Workout templates ("repeat last workout")
- Imperial units preference
- A Playwright E2E suite running in CI, plus a GitHub Actions pipeline for both test suites
