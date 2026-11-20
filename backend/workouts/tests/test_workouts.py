from decimal import Decimal
from unittest import mock

from django.db import IntegrityError

from exercises.models import Exercise
from workouts.models import ExerciseSet, Workout, WorkoutEntry

from .helpers import AuthedTestCase, exercise, make_user, workout_payload

URL = "/api/workouts/"


class CreateWorkoutTests(AuthedTestCase):
    def test_create_workout_with_multiple_exercises_and_sets(self):
        res = self.client.post(URL, workout_payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)

        workout = Workout.objects.get(pk=res.data["id"])
        self.assertEqual(workout.user, self.user)
        self.assertEqual(workout.title, "Monday Upper Body")
        self.assertEqual(workout.duration_minutes, 45)

        entries = list(workout.entries.order_by("order"))
        self.assertEqual([e.exercise.name for e in entries], ["Push-ups", "Dumbbell curl"])
        self.assertEqual([e.order for e in entries], [0, 1])

        pushups = list(entries[0].sets.values_list("set_number", "reps", "weight_kg"))
        self.assertEqual(pushups, [(1, 12, None), (2, 10, None), (3, 8, None)])
        curls = list(entries[1].sets.values_list("reps", "weight_kg"))
        self.assertEqual(curls, [(12, Decimal("5")), (12, Decimal("5")), (10, Decimal("6"))])

        # Response contains nested data
        self.assertEqual(len(res.data["entries"]), 2)
        self.assertEqual(res.data["entries"][1]["exercise"]["name"], "Dumbbell curl")
        self.assertEqual(res.data["entries"][1]["sets"][2]["weight_kg"], "6.00")

    def test_create_duration_and_distance_entries(self):
        payload = workout_payload(
            title="Cardio day",
            entries=[
                {"exercise_id": exercise("Running").id, "distance_km": "5.2", "duration_minutes": "28.5"},
                {"exercise_id": exercise("Plank").id, "duration_minutes": "2"},
            ],
        )
        res = self.client.post(URL, payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        run, plank = WorkoutEntry.objects.filter(workout_id=res.data["id"]).order_by("order")
        self.assertEqual(run.distance_km, Decimal("5.20"))
        self.assertEqual(run.duration_minutes, Decimal("28.50"))
        self.assertEqual(plank.duration_minutes, Decimal("2.00"))
        self.assertFalse(ExerciseSet.objects.exists())

    def test_distance_duration_is_optional(self):
        payload = workout_payload(entries=[{"exercise_id": exercise("Walking").id, "distance_km": "3"}])
        self.assertEqual(self.client.post(URL, payload, format="json").status_code, 201)


class ValidationTests(AuthedTestCase):
    def assertInvalid(self, payload, *path):
        res = self.client.post(URL, payload, format="json")
        self.assertEqual(res.status_code, 400, res.data)
        node = res.data
        for key in path:
            node = node[key]
        self.assertFalse(Workout.objects.exists())
        return node

    def test_blank_title(self):
        self.assertInvalid(workout_payload(title="   "), "title")

    def test_no_entries(self):
        self.assertInvalid(workout_payload(entries=[]), "entries")

    def test_invalid_and_future_dates(self):
        self.assertInvalid(workout_payload(date="2026-02-30"), "date")
        self.assertInvalid(workout_payload(date="2999-01-01"), "date")

    def test_set_based_exercise_requires_sets(self):
        errors = self.assertInvalid(workout_payload(entries=[{"exercise_id": exercise("Push-ups").id}]), "entries")
        self.assertIn("sets", errors[0])

    def test_reps_must_be_positive(self):
        for reps in (0, -3, 1001, "abc"):
            with self.subTest(reps=reps):
                payload = workout_payload(entries=[{"exercise_id": exercise("Push-ups").id, "sets": [{"reps": reps}]}])
                self.assertInvalid(payload, "entries")

    def test_weight_cannot_be_negative_or_extreme(self):
        for weight in ("-1", "1000.01"):
            with self.subTest(weight=weight):
                payload = workout_payload(
                    entries=[{"exercise_id": exercise("Bench press").id, "sets": [{"reps": 5, "weight_kg": weight}]}]
                )
                self.assertInvalid(payload, "entries")

    def test_bodyweight_exercise_rejects_weight(self):
        payload = workout_payload(
            entries=[{"exercise_id": exercise("Push-ups").id, "sets": [{"reps": 5, "weight_kg": "10"}]}]
        )
        self.assertInvalid(payload, "entries")

    def test_duration_exercise_requires_positive_duration(self):
        self.assertInvalid(workout_payload(entries=[{"exercise_id": exercise("Plank").id}]), "entries")
        self.assertInvalid(
            workout_payload(entries=[{"exercise_id": exercise("Plank").id, "duration_minutes": "0"}]), "entries"
        )

    def test_distance_exercise_requires_positive_distance_and_no_sets(self):
        self.assertInvalid(workout_payload(entries=[{"exercise_id": exercise("Running").id}]), "entries")
        self.assertInvalid(
            workout_payload(entries=[{"exercise_id": exercise("Running").id, "distance_km": "-2"}]), "entries"
        )
        self.assertInvalid(
            workout_payload(
                entries=[{"exercise_id": exercise("Running").id, "distance_km": "2", "sets": [{"reps": 3}]}]
            ),
            "entries",
        )

    def test_unknown_exercise(self):
        self.assertInvalid(workout_payload(entries=[{"exercise_id": 999999, "sets": [{"reps": 1}]}]), "entries")

    def test_other_users_custom_exercise_is_inaccessible(self):
        other = make_user("other")
        private = Exercise.objects.create(
            name="Secret move", category="strength", measurement_type="reps", owner=other
        )
        self.assertInvalid(workout_payload(entries=[{"exercise_id": private.id, "sets": [{"reps": 5}]}]), "entries")

    def test_session_duration_limits(self):
        self.assertInvalid(workout_payload(duration_minutes=0), "duration_minutes")
        self.assertInvalid(workout_payload(duration_minutes=1441), "duration_minutes")


class TransactionTests(AuthedTestCase):
    def test_failure_while_saving_sets_rolls_back_whole_workout(self):
        with mock.patch.object(ExerciseSet.objects, "bulk_create", side_effect=IntegrityError("boom")):
            with self.assertRaises(IntegrityError):
                self.client.post(URL, workout_payload(), format="json")
        self.assertEqual(Workout.objects.count(), 0)
        self.assertEqual(WorkoutEntry.objects.count(), 0)

    def test_failed_update_keeps_original_entries(self):
        workout_id = self.client.post(URL, workout_payload(), format="json").data["id"]
        with mock.patch.object(ExerciseSet.objects, "bulk_create", side_effect=IntegrityError("boom")):
            with self.assertRaises(IntegrityError):
                self.client.patch(f"{URL}{workout_id}/", workout_payload(title="Changed"), format="json")
        workout = Workout.objects.get(pk=workout_id)
        self.assertEqual(workout.title, "Monday Upper Body")
        self.assertEqual(workout.entries.count(), 2)
        self.assertEqual(ExerciseSet.objects.filter(entry__workout=workout).count(), 6)


class ReadUpdateDeleteTests(AuthedTestCase):
    def setUp(self):
        super().setUp()
        self.workout_id = self.client.post(URL, workout_payload(), format="json").data["id"]

    def test_history_is_reverse_chronological_and_paginated(self):
        for day in ("2026-11-10", "2026-11-18", "2026-11-01"):
            self.client.post(URL, workout_payload(title=f"W {day}", date=day), format="json")
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 4)
        self.assertEqual([w["date"] for w in res.data["results"]], ["2026-11-18", "2026-11-16", "2026-11-10", "2026-11-01"])
        first = res.data["results"][1]
        self.assertEqual(first["exercise_count"], 2)
        self.assertEqual(first["exercise_names"], ["Push-ups", "Dumbbell curl"])
        self.assertEqual(first["notes_preview"], "Felt strong")

    def test_history_filters(self):
        self.client.post(
            URL,
            workout_payload(
                title="Evening run",
                date="2026-11-12",
                entries=[{"exercise_id": exercise("Running").id, "distance_km": "4"}],
            ),
            format="json",
        )
        titles = lambda res: [w["title"] for w in res.data["results"]]  # noqa: E731
        self.assertEqual(titles(self.client.get(URL, {"search": "run"})), ["Evening run"])
        self.assertEqual(titles(self.client.get(URL, {"category": "cardio"})), ["Evening run"])
        self.assertEqual(titles(self.client.get(URL, {"date_from": "2026-11-13"})), ["Monday Upper Body"])
        self.assertEqual(titles(self.client.get(URL, {"date_to": "2026-11-12"})), ["Evening run"])
        self.assertEqual(self.client.get(URL, {"date_from": "bad"}).status_code, 400)
        self.assertEqual(self.client.get(URL, {"date_from": "2026-11-20", "date_to": "2026-11-01"}).status_code, 400)

    def test_list_avoids_n_plus_one(self):
        for i in range(5):
            self.client.post(URL, workout_payload(title=f"W{i}"), format="json")
        with self.assertNumQueries(3):  # count, workouts, prefetched entries+exercises
            self.client.get(URL)

    def test_retrieve_details(self):
        res = self.client.get(f"{URL}{self.workout_id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["entries"][0]["sets"][0], {"id": mock.ANY, "set_number": 1, "reps": 12, "weight_kg": None})

    def test_update_replaces_entries(self):
        payload = {
            "title": "Upper body (edited)",
            "date": "2026-11-17",
            "entries": [
                {
                    "exercise_id": exercise("Bench press").id,
                    "sets": [{"reps": 8, "weight_kg": "40"}, {"reps": 6, "weight_kg": "42.5"}],
                },
            ],
        }
        res = self.client.patch(f"{URL}{self.workout_id}/", payload, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        workout = Workout.objects.get(pk=self.workout_id)
        self.assertEqual(workout.title, "Upper body (edited)")
        self.assertEqual(str(workout.date), "2026-11-17")
        self.assertEqual(workout.entries.count(), 1)
        self.assertEqual(
            list(ExerciseSet.objects.filter(entry__workout=workout).values_list("set_number", "reps", "weight_kg")),
            [(1, 8, Decimal("40")), (2, 6, Decimal("42.5"))],
        )
        self.assertEqual(WorkoutEntry.objects.count(), 1)  # old entries removed, not orphaned

    def test_partial_update_without_entries_keeps_them(self):
        res = self.client.patch(f"{URL}{self.workout_id}/", {"notes": "Updated note"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["entries"]), 2)

    def test_delete_cascades(self):
        res = self.client.delete(f"{URL}{self.workout_id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Workout.objects.exists())
        self.assertFalse(WorkoutEntry.objects.exists())
        self.assertFalse(ExerciseSet.objects.exists())
        self.assertTrue(Exercise.objects.filter(name="Push-ups").exists())  # library untouched

    def test_put_not_allowed(self):
        self.assertEqual(self.client.put(f"{URL}{self.workout_id}/", workout_payload(), format="json").status_code, 405)


class OwnershipTests(AuthedTestCase):
    def setUp(self):
        super().setUp()
        self.other = make_user("intruder")
        self.workout_id = self.client.post(URL, workout_payload(), format="json").data["id"]
        self.client.force_authenticate(self.other)

    def test_other_user_cannot_see_list_or_detail(self):
        self.assertEqual(self.client.get(URL).data["count"], 0)
        self.assertEqual(self.client.get(f"{URL}{self.workout_id}/").status_code, 404)

    def test_other_user_cannot_edit_or_delete(self):
        res = self.client.patch(f"{URL}{self.workout_id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.client.delete(f"{URL}{self.workout_id}/").status_code, 404)
        self.assertEqual(Workout.objects.get(pk=self.workout_id).title, "Monday Upper Body")

    def test_user_field_cannot_be_spoofed(self):
        res = self.client.post(URL, workout_payload(user=self.user.id), format="json")
        self.assertEqual(Workout.objects.get(pk=res.data["id"]).user, self.other)
