from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from exercises.models import Exercise

# Upper bounds that catch typos (e.g. 1000 kg) without blocking real training.
MAX_SESSION_MINUTES = 24 * 60
MAX_REPS = 1000
MAX_WEIGHT_KG = Decimal("1000")
MAX_DISTANCE_KM = Decimal("1000")
MAX_SETS = 50
MAX_ENTRIES = 30


class Workout(models.Model):
    """One training session. Counts as exactly one workout in every statistic."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workouts")
    title = models.CharField(max_length=100)
    date = models.DateField(help_text="Calendar date of the session, in the user's local time.")
    notes = models.TextField(blank=True, max_length=2000)
    duration_minutes = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(MAX_SESSION_MINUTES)],
        help_text="Optional overall session length.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["user", "-date"], name="workout_user_date_idx")]

    def __str__(self) -> str:
        return f"{self.title} ({self.date})"


class WorkoutEntry(models.Model):
    """An exercise performed within a workout."""

    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="entries")
    # PROTECT: an exercise that has been logged cannot silently disappear from history.
    exercise = models.ForeignKey(Exercise, on_delete=models.PROTECT, related_name="workout_entries")
    order = models.PositiveSmallIntegerField(default=0)
    duration_minutes = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(Decimal(MAX_SESSION_MINUTES))],
    )
    distance_km = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(MAX_DISTANCE_KM)],
    )
    notes = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [models.UniqueConstraint(fields=["workout", "order"], name="unique_entry_order")]

    def __str__(self) -> str:
        return f"{self.exercise} in {self.workout_id}"


class ExerciseSet(models.Model):
    """A single set of a repetition-based exercise."""

    entry = models.ForeignKey(WorkoutEntry, on_delete=models.CASCADE, related_name="sets")
    set_number = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    reps = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(MAX_REPS)])
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(MAX_WEIGHT_KG)],
    )

    class Meta:
        ordering = ["set_number"]
        constraints = [
            models.UniqueConstraint(fields=["entry", "set_number"], name="unique_set_number"),
            models.CheckConstraint(condition=models.Q(reps__gte=1), name="set_reps_positive"),
            models.CheckConstraint(
                condition=models.Q(weight_kg__isnull=True) | models.Q(weight_kg__gte=0), name="set_weight_non_negative"
            ),
        ]

    def __str__(self) -> str:
        return f"Set {self.set_number}: {self.reps} reps"
