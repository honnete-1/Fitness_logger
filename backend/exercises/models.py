from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


class Exercise(models.Model):
    """
    An exercise in the library. System exercises have no owner and are visible
    to everyone; custom exercises belong to (and are visible to) one user.
    """

    class Category(models.TextChoices):
        STRENGTH = "strength", "Strength"
        CARDIO = "cardio", "Cardio"
        FLEXIBILITY = "flexibility", "Flexibility"
        MOBILITY = "mobility", "Mobility"
        BODYWEIGHT = "bodyweight", "Bodyweight"

    class MeasurementType(models.TextChoices):
        REPS = "reps", "Sets × reps"
        REPS_WEIGHT = "reps_weight", "Sets × reps (+ optional weight)"
        DURATION = "duration", "Duration"
        DISTANCE = "distance", "Distance (+ optional duration)"

    name = models.CharField(max_length=100)
    description = models.CharField(max_length=500, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    measurement_type = models.CharField(max_length=20, choices=MeasurementType.choices)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_exercises",
        help_text="Empty for built-in exercises.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"), condition=models.Q(owner__isnull=True), name="unique_system_exercise_name"
            ),
            models.UniqueConstraint(
                Lower("name"), "owner", condition=models.Q(owner__isnull=False), name="unique_custom_exercise_name"
            ),
        ]
        indexes = [models.Index(fields=["category"])]

    def __str__(self) -> str:
        return self.name

    @property
    def uses_sets(self) -> bool:
        return self.measurement_type in (self.MeasurementType.REPS, self.MeasurementType.REPS_WEIGHT)
