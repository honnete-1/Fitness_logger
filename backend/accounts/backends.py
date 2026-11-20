from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class UsernameOrEmailBackend(ModelBackend):
    """Authenticate with either the username or the (case-insensitive) email."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        User = get_user_model()
        identifier = username.strip()
        lookup = {"email__iexact": identifier} if "@" in identifier else {"username__iexact": identifier}
        user = User.objects.filter(**lookup).order_by("id").first()
        if user is None:
            # Run the hasher anyway to reduce timing differences between
            # "unknown user" and "wrong password".
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
