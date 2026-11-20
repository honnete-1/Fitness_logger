from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class UserGoal(models.Model):
    """A user's weekly workout target (one row per user)."""

    MIN_TARGET = 1
    MAX_TARGET = 14

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goal")
    weekly_workout_target = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(MIN_TARGET), MaxValueValidator(MAX_TARGET)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(weekly_workout_target__gte=1, weekly_workout_target__lte=14),
                name="usergoal_target_range",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} – {self.weekly_workout_target}/week"
