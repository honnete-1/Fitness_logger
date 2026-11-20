# Deployment Guide

## Recommended: single origin (Django serves the SPA)

The React app is built into `frontend/dist`. In production, Django serves it with WhiteNoise:

- `WHITENOISE_ROOT` serves `/assets/*` and `/favicon.svg`.
- A catch-all route returns `index.html` for client-side routes.

The browser therefore sees **one origin**. Session cookies, CSRF and `SameSite=Lax` work without CORS, and no extra service is needed.

> **Do not use SQLite in production on platforms with ephemeral disks** (Render, Railway, Fly.io, Heroku); data is lost on every deploy. `production.py` refuses to start without `DATABASE_URL`.

### Build and run commands

The commands are the same on any Linux host or PaaS. Run them from the repository root:

```bash
# Build step
cd frontend && npm ci && npm run build && cd ..
pip install -r backend/requirements.txt
cd backend
python manage.py collectstatic --noinput
python manage.py migrate --noinput

# Start command (from backend/)
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

`config/wsgi.py` defaults to `config.settings.production`.

### Required environment variables

| Variable | Example |
|---|---|
| `DJANGO_SECRET_KEY` | output of `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_ALLOWED_HOSTS` | `fitlog.onrender.com` |
| `DATABASE_URL` | `postgres://user:pass@host:5432/fitness_logger` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://fitlog.onrender.com` |

Optional:

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_SECURE_SSL_REDIRECT` | `true` | Set to `false` only if the proxy already forces HTTPS and redirects loop |
| `DJANGO_HSTS_SECONDS` | 30 days | |

### Example: Render

1. Create a **PostgreSQL** instance and copy its internal connection string.
2. Create a **Web Service** from the GitHub repository with these settings:
   - **Runtime:** Python 3.12. Node is available in Render's Python image; otherwise add a Node build step.
   - **Build command:**
     ```bash
     cd frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput
     ```
   - **Start command:** `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
3. Add the environment variables above, then deploy.
4. Optionally, create an admin account: `python manage.py createsuperuser` in the Render shell.

The built-in exercise library is created by migration `exercises/0002`, so no separate seeding step is needed.

### Security checklist (production settings)

| Setting | Value |
|---|---|
| `DEBUG` | `False` |
| Secret key and hosts | Read from the environment; startup fails if missing |
| `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` | `True` |
| Session cookie | `HttpOnly` |
| `SameSite` | `Lax` |
| HTTPS redirect | On, with `SECURE_PROXY_SSL_HEADER` for TLS-terminating proxies |
| HSTS | 30 days |
| Other headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` |
| Static files | Hashed and compressed (`CompressedManifestStaticFilesStorage`) |
| Auth endpoints | Throttled to 20 requests/min per client |

Run `python manage.py check --deploy` with production variables set. The only remaining warnings are `SECURE_HSTS_INCLUDE_SUBDOMAINS` and `SECURE_HSTS_PRELOAD`. They are left off deliberately because they affect the whole domain, so enable them only once all subdomains are HTTPS-only.

## Alternative: separate frontend host

If you host `frontend/dist` on a static host (Netlify, Vercel) and the API elsewhere, you must either:

- **Proxy `/api/*` through the static host** to the backend. This keeps a single origin and needs no code changes. Netlify `_redirects` example: `/api/*  https://api.example.com/api/:splat  200`.
- **Or** make the setup truly cross-origin. That requires:
  - adding `django-cors-headers` with `CORS_ALLOWED_ORIGINS` and `CORS_ALLOW_CREDENTIALS=True`;
  - setting `SESSION_COOKIE_SAMESITE`/`CSRF_COOKIE_SAMESITE = "None"`, with `Secure` cookies;
  - adding the frontend origin to `CSRF_TRUSTED_ORIGINS`;
  - sending `credentials: "include"` in `src/api/client.ts`.

  This is not the default because cross-site cookies are increasingly restricted by browsers.

## Verified locally

The production configuration was smoke-tested on Windows with `runserver` under `config.settings.production`. It served `/` and `/dashboard` as the SPA, hashed `/assets/*.js` files, `/static/admin/...`, and JSON 401/404 from `/api/`. No hosted deployment has been performed yet.
