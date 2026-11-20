from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .authentication import SessionAuthentication401
from .models import UserGoal
from .serializers import LoginSerializer, RegisterSerializer, UserGoalSerializer, UserSerializer


def enforce_csrf(request) -> None:
    """
    DRF only enforces CSRF for requests that are already authenticated.
    Login and registration are anonymous, so check explicitly to prevent
    login-CSRF attacks.
    """
    SessionAuthentication401().enforce_csrf(request)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Sets the csrftoken cookie so the SPA can send it back as X-CSRFToken."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        enforce_csrf(request)
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Registration signs the user in immediately (documented behaviour).
        login(request._request, user, backend="accounts.backends.UsernameOrEmailBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        enforce_csrf(request)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request._request,
            username=serializer.validated_data["identifier"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Incorrect username/email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request._request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GoalView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _goal(user) -> UserGoal:
        goal, _ = UserGoal.objects.get_or_create(user=user)
        return goal

    def get(self, request):
        return Response(UserGoalSerializer(self._goal(request.user)).data)

    def patch(self, request):
        serializer = UserGoalSerializer(self._goal(request.user), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
