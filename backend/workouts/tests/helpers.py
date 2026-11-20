from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import UserGoal
from exercises.models import Exercise

User = get_user_model()


def make_user(username="alex", password="Strong-pass-123", email=None) -> User:
    user = User.objects.create_user(username=username, email=email or f"{username}@example.com", password=password)
    UserGoal.objects.create(user=user)
    return user


def exercise(name: str) -> Exercise:
    return Exercise.objects.get(name=name, owner__isnull=True)


def workout_payload(**overrides) -> dict:
    payload = {
        "title": "Monday Upper Body",
        "date": "2026-11-16",
        "notes": "Felt strong",
        "duration_minutes": 45,
        "entries": [
            {"exercise_id": exercise("Push-ups").id, "sets": [{"reps": 12}, {"reps": 10}, {"reps": 8}]},
            {
                "exercise_id": exercise("Dumbbell curl").id,
                "sets": [
                    {"reps": 12, "weight_kg": "5"},
                    {"reps": 12, "weight_kg": "5"},
                    {"reps": 10, "weight_kg": "6"},
                ],
            },
        ],
    }
    payload.update(overrides)
    return payload


class AuthedTestCase(APITestCase):
    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(self.user)
