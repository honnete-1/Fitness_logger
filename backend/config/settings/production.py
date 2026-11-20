"""
Production settings.

Required environment variables:
  DJANGO_SECRET_KEY            long random string
  DJANGO_ALLOWED_HOSTS         e.g. "fitlog.example.com"
  DATABASE_URL                 e.g. "postgres://user:pass@host:5432/dbname"
Optional:
  DJANGO_CSRF_TRUSTED_ORIGINS  e.g. "https://fitlog.example.com"
  DJANGO_SECURE_SSL_REDIRECT   default "true"
"""

import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import FRONTEND_DIST, env_bool, env_list

DEBUG = False

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set in production.")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Most hosting platforms have ephemeral disks, so SQLite data would be lost.
    raise ImproperlyConfigured("DATABASE_URL must be set in production (PostgreSQL recommended).")
DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, conn_health_checks=True)}

# --- HTTPS hardening ------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "2592000"))  # 30 days
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# --- Static files & single-origin SPA -------------------------------------
# WhiteNoise serves Django's static files and the built React app (frontend/dist)
# from the same origin as the API.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.exists() else None

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
