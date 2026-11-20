"""Local development settings: SQLite, DEBUG on, browsable API enabled."""

import os
import sys

from .base import *  # noqa: F401,F403
from .base import BASE_DIR, REST_FRAMEWORK, env_bool, env_list

DEBUG = env_bool("DJANGO_DEBUG", True)

# A fixed development key is acceptable only because production.py refuses to
# start without DJANGO_SECRET_KEY being set explicitly.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-key-do-not-use-in-production")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1],testserver")

# The Vite dev server proxies /api to Django, so its origin must be trusted
# for the CSRF Origin check.
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# Fast (insecure) hashing only while running the test suite.
if "test" in sys.argv:
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
