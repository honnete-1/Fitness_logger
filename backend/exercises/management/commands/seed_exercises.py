from django.core.management.base import BaseCommand

from exercises.models import Exercise
from exercises.seed_data import EXERCISES


def seed(exercise_model) -> int:
    """Insert missing built-in exercises; existing ones (matched by name) are left untouched."""
    existing = {name.lower() for name in exercise_model.objects.filter(owner__isnull=True).values_list("name", flat=True)}
    to_create = [
        exercise_model(name=name, category=category, measurement_type=measurement, description=description)
        for name, category, measurement, description in EXERCISES
        if name.lower() not in existing
    ]
    exercise_model.objects.bulk_create(to_create)
    return len(to_create)


class Command(BaseCommand):
    help = "Add any missing built-in exercises to the library (idempotent)."

    def handle(self, *args, **options):
        created = seed(Exercise)
        self.stdout.write(self.style.SUCCESS(f"Added {created} built-in exercise(s)."))
