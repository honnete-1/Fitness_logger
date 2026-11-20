"""
Create a local demo account with ~8 weeks of realistic workouts.

    python manage.py seed_demo            # user "demo", password "demo-pass-2026"
    python manage.py seed_demo --reset    # delete and recreate the demo user's data

Refuses to run unless DEBUG is on, so it can never touch production.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import UserGoal
from exercises.models import Exercise
from workouts.models import ExerciseSet, Workout, WorkoutEntry

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo-pass-2026"  # local development only

TEMPLATES = [
    ("Upper body strength", [("Bench press", 3, 8, 40), ("Dumbbell curl", 3, 12, 8), ("Shoulder press", 3, 10, 14)], 50),
    ("Lower body day", [("Barbell back squat", 4, 6, 60), ("Romanian deadlift", 3, 10, 40), ("Lunges", 3, 12, None)], 55),
    ("Easy run", [("Running", "km", 5.0, 30)], 32),
    ("Bodyweight circuit", [("Push-ups", 3, 15, None), ("Squats", 3, 20, None), ("Plank", "min", 3, None)], 30),
    ("Mobility & stretch", [("Hip flexor stretch", "min", 5, None), ("Hamstring stretch", "min", 5, None), ("Cat-cow", "min", 4, None)], 20),
    ("Evening walk", [("Walking", "km", 4.2, 48)], 48),
]


class Command(BaseCommand):
    help = "Create a demo user with sample workouts (development only)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Remove existing demo workouts first.")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DEBUG=True.")
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=DEMO_USERNAME, defaults={"email": "demo@example.test", "first_name": "Alex"}
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        UserGoal.objects.update_or_create(user=user, defaults={"weekly_workout_target": 3})

        if options["reset"]:
            Workout.objects.filter(user=user).delete()
        elif Workout.objects.filter(user=user).exists():
            self.stdout.write("Demo user already has workouts; use --reset to regenerate.")
            return

        rng = random.Random(42)
        exercises = {e.name: e for e in Exercise.objects.filter(owner__isnull=True)}
        today = timezone.localdate()
        count = 0
        for days_ago in range(56, -1, -1):
            # Roughly 3 sessions a week, a little busier recently.
            chance = 0.38 if days_ago > 21 else 0.5
            if rng.random() > chance:
                continue
            title, items, minutes = rng.choice(TEMPLATES)
            workout = Workout.objects.create(
                user=user,
                title=title,
                date=today - timedelta(days=days_ago),
                duration_minutes=minutes + rng.randint(-5, 8),
                notes=rng.choice(["", "", "Felt strong today.", "Short on time but got it done.", "Great energy!"]),
            )
            for order, (name, a, b, c) in enumerate(items):
                ex = exercises[name]
                entry = WorkoutEntry.objects.create(workout=workout, exercise=ex, order=order)
                if a == "km":
                    entry.distance_km = Decimal(str(round(b + rng.uniform(-0.8, 1.2), 2)))
                    entry.duration_minutes = Decimal(c + rng.randint(-3, 6))
                    entry.save()
                elif a == "min":
                    entry.duration_minutes = Decimal(b)
                    entry.save()
                else:
                    for n in range(1, a + 1):
                        weight = None if c is None else Decimal(c + 2.5 * rng.randint(0, 2))
                        ExerciseSet.objects.create(entry=entry, set_number=n, reps=max(1, b - rng.randint(0, 2)), weight_kg=weight)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Demo user '{DEMO_USERNAME}' ready with {count} workouts."))
