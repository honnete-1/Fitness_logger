from datetime import date

from django.test import SimpleTestCase

from accounts.models import UserGoal
from workouts.analytics import resolve_today, start_of_week

from .helpers import AuthedTestCase, exercise, make_user, workout_payload

# 2026-11-20 is a Friday; its ISO week is Mon 16 – Sun 22 November.
TODAY = "2026-11-20"


class HelperTests(SimpleTestCase):
    def test_start_of_week_is_monday(self):
        self.assertEqual(start_of_week(date(2026, 11, 20)), date(2026, 11, 16))
        self.assertEqual(start_of_week(date(2026, 11, 16)), date(2026, 11, 16))
        self.assertEqual(start_of_week(date(2026, 11, 22)), date(2026, 11, 16))

    def test_resolve_today_rejects_implausible_values(self):
        from django.utils import timezone

        server = timezone.localdate()
        self.assertEqual(resolve_today(None), server)
        self.assertEqual(resolve_today("garbage"), server)
        self.assertEqual(resolve_today("1999-01-01"), server)
        self.assertEqual(resolve_today(server.isoformat()), server)


class StatsTestCase(AuthedTestCase):
    def log(self, day: str, duration=None, entries=None, title="Session"):
        payload = workout_payload(title=title, date=day, duration_minutes=duration)
        if entries is not None:
            payload["entries"] = entries
        res = self.client.post("/api/workouts/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data["id"]


class DashboardTests(StatsTestCase):
    def test_empty_dashboard(self):
        res = self.client.get("/api/dashboard/summary/", {"today": TODAY})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_workouts"], 0)
        self.assertEqual(res.data["workouts_this_week"], 0)
        self.assertEqual(res.data["total_duration_minutes"], 0)
        self.assertEqual(res.data["recent_workouts"], [])
        self.assertEqual(len(res.data["last_7_days"]["days"]), 7)
        self.assertTrue(all(d["workouts"] == 0 for d in res.data["last_7_days"]["days"]))

    def test_dashboard_statistics(self):
        self.log("2026-11-16", duration=40)  # this week (Mon)
        self.log("2026-11-16", duration=None)  # same day, no duration
        self.log("2026-11-20", duration=30)  # this week (Fri)
        self.log("2026-11-15", duration=60)  # last week (Sun)
        self.log("2026-10-01", duration=20)  # older
        # Another user's data must not leak into the numbers.
        intruder = make_user("intruder")
        self.client.force_authenticate(intruder)
        self.log("2026-11-18", duration=999)
        self.client.force_authenticate(self.user)

        res = self.client.get("/api/dashboard/summary/", {"today": TODAY})
        data = res.data
        self.assertEqual(data["total_workouts"], 5)
        self.assertEqual(data["workouts_this_week"], 3)
        self.assertEqual(data["total_duration_minutes"], 150)
        self.assertEqual(data["workouts_with_duration"], 4)
        self.assertEqual(data["total_logged_exercises"], 10)  # 5 workouts × 2 entries
        self.assertEqual(data["week"], {"start": "2026-11-16", "end": "2026-11-22"})

        days = {d["date"]: d["workouts"] for d in data["last_7_days"]["days"]}
        self.assertEqual(data["last_7_days"]["period"], {"start": "2026-11-14", "end": "2026-11-20"})
        self.assertEqual(days["2026-11-16"], 2)
        self.assertEqual(days["2026-11-15"], 1)
        self.assertEqual(days["2026-11-20"], 1)
        self.assertEqual(days["2026-11-18"], 0)

        self.assertEqual(len(data["recent_workouts"]), 5)
        self.assertEqual(data["recent_workouts"][0]["date"], "2026-11-20")

        self.assertEqual(data["goal"]["weekly_target"], 3)
        self.assertEqual(data["goal"]["completed"], 3)
        self.assertEqual(data["goal"]["remaining"], 0)

    def test_workout_counts_once_regardless_of_entries(self):
        many = [{"exercise_id": exercise("Push-ups").id, "sets": [{"reps": 5}]} for _ in range(6)]
        self.log("2026-11-17", entries=many)
        data = self.client.get("/api/dashboard/summary/", {"today": TODAY}).data
        self.assertEqual(data["workouts_this_week"], 1)
        self.assertEqual(data["total_logged_exercises"], 6)

    def test_deleting_workout_updates_statistics(self):
        workout_id = self.log("2026-11-18")
        self.client.delete(f"/api/workouts/{workout_id}/")
        data = self.client.get("/api/dashboard/summary/", {"today": TODAY}).data
        self.assertEqual(data["total_workouts"], 0)
        self.assertEqual(data["workouts_this_week"], 0)


class GoalStreakTests(StatsTestCase):
    def setUp(self):
        super().setUp()
        UserGoal.objects.filter(user=self.user).update(weekly_workout_target=2)

    def streak(self):
        return self.client.get("/api/dashboard/summary/", {"today": TODAY}).data["goal"]["streak_weeks"]

    def test_streak_counts_consecutive_weeks_meeting_target(self):
        # Weeks starting 2 Nov and 9 Nov meet the target of 2; 26 Oct does not.
        for day in ("2026-10-27", "2026-11-03", "2026-11-05", "2026-11-09", "2026-11-14"):
            self.log(day)
        self.assertEqual(self.streak(), 2)  # current week not yet met: counted from last week

        self.log("2026-11-17")
        self.assertEqual(self.streak(), 2)
        self.log("2026-11-19")
        self.assertEqual(self.streak(), 3)  # current week now met

    def test_gap_breaks_streak(self):
        for day in ("2026-11-02", "2026-11-03"):  # met two weeks ago
            self.log(day)
        self.log("2026-11-10")  # last week: only 1
        self.assertEqual(self.streak(), 0)


class ProgressTests(StatsTestCase):
    def test_weekly_progress_is_monday_to_sunday(self):
        self.log("2026-11-16")
        self.log("2026-11-19")
        self.log("2026-11-19")
        self.log("2026-11-23")  # next week: outside the period
        res = self.client.get("/api/progress/weekly/", {"today": TODAY})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["period"], {"start": "2026-11-16", "end": "2026-11-22"})
        self.assertEqual([d["weekday"] for d in res.data["days"]], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
        self.assertEqual([d["workouts"] for d in res.data["days"]], [1, 0, 0, 2, 0, 0, 0])
        self.assertEqual(res.data["total_workouts"], 3)
        self.assertEqual(res.data["active_days"], 2)

    def log(self, day, **kwargs):
        # Allow logging "future" relative to TODAY in tests without touching the clock.
        from workouts.models import Workout

        if day > TODAY:
            return Workout.objects.create(user=self.user, title="Future", date=day).id
        return super().log(day, **kwargs)

    def test_trends(self):
        self.log("2026-11-02", duration=30)  # week of 2 Nov
        self.log("2026-11-10", duration=45)  # week of 9 Nov
        self.log("2026-11-11")
        self.log(
            "2026-11-18",
            entries=[{"exercise_id": exercise("Running").id, "distance_km": "5"}],
        )
        self.log("2026-09-01")  # outside the 4-week window
        res = self.client.get("/api/progress/trends/", {"weeks": 4, "today": TODAY})
        self.assertEqual(res.status_code, 200)
        data = res.data
        self.assertEqual(data["period"], {"start": "2026-10-26", "end": "2026-11-22"})
        self.assertEqual([w["week_start"] for w in data["weeks"]], ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"])
        self.assertEqual([w["workouts"] for w in data["weeks"]], [0, 1, 2, 1])
        self.assertEqual([w["logged_exercises"] for w in data["weeks"]], [0, 2, 4, 1])
        self.assertEqual([w["duration_minutes"] for w in data["weeks"]], [0, 30, 45, 0])
        self.assertEqual(data["total_workouts"], 4)
        self.assertEqual(data["average_per_week"], 1.0)
        self.assertEqual(data["active_weeks"], 3)
        cats = {c["category"]: c["logged_exercises"] for c in data["categories"]}
        self.assertEqual(cats, {"bodyweight": 3, "strength": 3, "cardio": 1})
        self.assertEqual(data["top_exercises"][0]["times"], 3)
        self.assertEqual(data["all_time"]["total_workouts"], 5)

    def test_trends_validation(self):
        for value in ("0", "27", "abc"):
            self.assertEqual(self.client.get("/api/progress/trends/", {"weeks": value}).status_code, 400)
