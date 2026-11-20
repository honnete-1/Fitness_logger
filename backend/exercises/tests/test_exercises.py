from exercises.models import Exercise
from workouts.tests.helpers import AuthedTestCase, make_user, workout_payload

URL = "/api/exercises/"


class ExerciseLibraryTests(AuthedTestCase):
    def test_lists_seeded_library(self):
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        names = {e["name"] for e in res.data}
        self.assertTrue({"Bench press", "Push-ups", "Running", "Hamstring stretch"} <= names)
        categories = {e["category"] for e in res.data}
        self.assertEqual(categories, {"strength", "cardio", "flexibility", "mobility", "bodyweight"})

    def test_filter_and_search(self):
        res = self.client.get(URL, {"category": "cardio"})
        self.assertTrue(res.data and all(e["category"] == "cardio" for e in res.data))
        res = self.client.get(URL, {"search": "curl"})
        self.assertEqual([e["name"] for e in res.data], ["Dumbbell curl"])

    def test_measurement_types(self):
        by_name = {e["name"]: e["measurement_type"] for e in self.client.get(URL).data}
        self.assertEqual(by_name["Bench press"], "reps_weight")
        self.assertEqual(by_name["Push-ups"], "reps")
        self.assertEqual(by_name["Plank"], "duration")
        self.assertEqual(by_name["Running"], "distance")

    def test_builtin_exercises_are_read_only(self):
        bench = Exercise.objects.get(name="Bench press")
        self.assertEqual(self.client.patch(f"{URL}{bench.id}/", {"name": "X"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(f"{URL}{bench.id}/").status_code, 403)


class CustomExerciseTests(AuthedTestCase):
    def create(self, **overrides):
        data = {"name": "Kettlebell swing", "category": "strength", "measurement_type": "reps_weight"}
        data.update(overrides)
        return self.client.post(URL, data, format="json")

    def test_create_custom_exercise(self):
        res = self.create()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["is_custom"])
        self.assertEqual(Exercise.objects.get(pk=res.data["id"]).owner, self.user)

    def test_duplicate_names_rejected(self):
        self.assertEqual(self.create(name="bench PRESS").status_code, 400)
        self.create()
        self.assertEqual(self.create(name="kettlebell swing").status_code, 400)

    def test_invalid_choices(self):
        res = self.create(category="nutrition", measurement_type="calories")
        self.assertEqual(res.status_code, 400)
        self.assertIn("category", res.data)
        self.assertIn("measurement_type", res.data)

    def test_custom_exercises_are_private(self):
        mine = self.create().data["id"]
        other = make_user("other")
        self.client.force_authenticate(other)
        self.assertNotIn(mine, [e["id"] for e in self.client.get(URL).data])
        self.assertEqual(self.client.get(f"{URL}{mine}/").status_code, 404)
        self.assertEqual(self.client.delete(f"{URL}{mine}/").status_code, 404)

    def test_owner_can_update_and_delete(self):
        ex_id = self.create().data["id"]
        res = self.client.patch(f"{URL}{ex_id}/", {"description": "Hip hinge power"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.delete(f"{URL}{ex_id}/").status_code, 204)

    def test_logged_exercise_cannot_be_deleted_or_retyped(self):
        ex_id = self.create().data["id"]
        payload = workout_payload(entries=[{"exercise_id": ex_id, "sets": [{"reps": 15, "weight_kg": "16"}]}])
        self.assertEqual(self.client.post("/api/workouts/", payload, format="json").status_code, 201)
        self.assertEqual(self.client.delete(f"{URL}{ex_id}/").status_code, 409)
        res = self.client.patch(f"{URL}{ex_id}/", {"measurement_type": "duration"}, format="json")
        self.assertEqual(res.status_code, 400)
