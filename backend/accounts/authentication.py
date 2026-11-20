from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """
    DRF's SessionAuthentication answers unauthenticated requests with 403.
    Providing a WWW-Authenticate value makes DRF return 401 instead, which lets
    the frontend distinguish "not logged in" from "not allowed".
    CSRF enforcement is inherited unchanged.
    """

    def authenticate_header(self, request):
        return 'Session realm="api"'
