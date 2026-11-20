from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import UserGoal

User = get_user_model()


def _validate_unique_email(email: str, exclude_pk=None) -> str:
    email = User.objects.normalize_email(email.strip()).lower()
    qs = User.objects.filter(email__iexact=email)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise serializers.ValidationError("An account with this email already exists.")
    return email


def _validate_unique_username(username: str, exclude_pk=None) -> str:
    username = username.strip()
    qs = User.objects.filter(username__iexact=username)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise serializers.ValidationError("This username is already taken.")
    return username


def _run_username_validators(username: str) -> None:
    """Reuse Django's own username rules (letters, digits and @/./+/-/_)."""
    field = User._meta.get_field("username")
    try:
        for validator in field.validators:
            validator(username)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc


class UserSerializer(serializers.ModelSerializer):
    """The authenticated user's own account. `display_name` maps to first_name."""

    display_name = serializers.CharField(source="first_name", max_length=150, required=False, allow_blank=True)
    weekly_workout_target = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "display_name", "date_joined", "weekly_workout_target"]
        read_only_fields = ["id", "date_joined"]
        extra_kwargs = {"email": {"required": True, "allow_blank": False}}

    def get_weekly_workout_target(self, user) -> int:
        goal = UserGoal.objects.filter(user=user).first()
        return goal.weekly_workout_target if goal else UserGoal._meta.get_field("weekly_workout_target").default

    def validate_username(self, value):
        value = value.strip()
        _run_username_validators(value)
        return _validate_unique_username(value, exclude_pk=self.instance.pk if self.instance else None)

    def validate_email(self, value):
        return _validate_unique_email(value, exclude_pk=self.instance.pk if self.instance else None)

    def validate_display_name(self, value):
        return value.strip()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_username(self, value):
        value = value.strip()
        _run_username_validators(value)
        return _validate_unique_username(value)

    def validate_email(self, value):
        return _validate_unique_email(value)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})
        candidate = User(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        UserGoal.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, help_text="Username or email address")
    password = serializers.CharField(trim_whitespace=False, max_length=128)


class UserGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGoal
        fields = ["weekly_workout_target", "updated_at"]
        read_only_fields = ["updated_at"]
