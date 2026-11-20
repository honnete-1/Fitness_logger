from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path


def api_not_found(request, *args, **kwargs):
    return JsonResponse({"detail": "Not found."}, status=404)


def spa_index(request, *args, **kwargs):
    """
    Single-origin deployment: serve the built React app for client-side routes.
    Built assets themselves are served by WhiteNoise (WHITENOISE_ROOT).
    """
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        raise Http404("Frontend build not found. Run `npm run build` in frontend/, or use the Vite dev server.")
    return FileResponse(index.open("rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("workouts.urls")),
    re_path(r"^api/.*$", api_not_found),
    re_path(r"^(?!static/).*$", spa_index),
]
