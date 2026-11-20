"""
Workout statistics.

Definitions (also documented in docs/ENGINEERING.md):

* A *workout* is one saved Workout row. It counts once regardless of how many
  exercises it contains.
* A *logged exercise* is one WorkoutEntry (an exercise performed within a workout).
* Workout dates are calendar dates chosen by the user, so no time-zone
  conversion is applied to them. "Today" is the client's local date, passed as
  ``?today=YYYY-MM-DD``; the server's date is used if it is absent or implausible.
* Weeks run Monday–Sunday (ISO 8601).
* The *goal streak* is the number of consecutive weeks in which the user logged
  at least their weekly target. The current week is included once its target is
  met; until then the streak counts back from last week. Weeks are judged
  against the user's *current* target (targets are not versioned).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncWeek
from django.utils import timezone

from exercises.models import Exercise

from .models import Workout, WorkoutEntry

MAX_TREND_WEEKS = 26


def resolve_today(raw: str | None) -> date:
    """Use the client's local date when it is within a day of the server's."""
    server_today = timezone.localdate()
    if raw:
        try:
            candidate = date.fromisoformat(raw)
        except ValueError:
            return server_today
        if abs((candidate - server_today).days) <= 1:
            return candidate
    return server_today


def start_of_week(day: date) -> date:
    return day - timedelta(days=day.weekday())


@dataclass(frozen=True)
class Period:
    start: date
    end: date  # inclusive

    def as_dict(self) -> dict:
        return {"start": self.start.isoformat(), "end": self.end.isoformat()}


def daily_counts(user, period: Period) -> list[dict]:
    rows = (
        Workout.objects.filter(user=user, date__range=(period.start, period.end))
        .values("date")
        .annotate(count=Count("id"))
    )
    by_day = {row["date"]: row["count"] for row in rows}
    days = (period.end - period.start).days + 1
    return [
        {
            "date": (period.start + timedelta(days=i)).isoformat(),
            "weekday": (period.start + timedelta(days=i)).strftime("%a"),
            "workouts": by_day.get(period.start + timedelta(days=i), 0),
        }
        for i in range(days)
    ]


def _weekly_workout_counts(user, since: date | None = None) -> dict[date, int]:
    qs = Workout.objects.filter(user=user)
    if since is not None:
        qs = qs.filter(date__gte=since)
    rows = qs.annotate(week=TruncWeek("date")).values("week").annotate(count=Count("id"))
    return {_as_date(row["week"]): row["count"] for row in rows}


def _as_date(value) -> date:
    # TruncWeek on a DateField returns a date, but some backends return datetime.
    return value.date() if hasattr(value, "date") and callable(value.date) else value


def goal_streak(user, target: int, today: date) -> int:
    counts = _weekly_workout_counts(user)
    week = start_of_week(today)
    streak = 0
    if counts.get(week, 0) >= target:
        streak += 1
    week -= timedelta(weeks=1)
    while counts.get(week, 0) >= target:
        streak += 1
        week -= timedelta(weeks=1)
    return streak


def weekly_trend(user, weeks: int, today: date) -> list[dict]:
    """Per-week totals for the `weeks` most recent weeks, oldest first, ending with the current week."""
    current = start_of_week(today)
    first = current - timedelta(weeks=weeks - 1)
    end = current + timedelta(days=6)

    workouts = _weekly_workout_counts(user, since=first)
    workouts = {k: v for k, v in workouts.items() if k <= current}

    entry_rows = (
        WorkoutEntry.objects.filter(workout__user=user, workout__date__range=(first, end))
        .annotate(week=TruncWeek("workout__date"))
        .values("week")
        .annotate(count=Count("id"))
    )
    entries = {_as_date(r["week"]): r["count"] for r in entry_rows}

    duration_rows = (
        Workout.objects.filter(user=user, date__range=(first, end))
        .annotate(week=TruncWeek("date"))
        .values("week")
        .annotate(total=Sum("duration_minutes"))
    )
    durations = {_as_date(r["week"]): r["total"] or 0 for r in duration_rows}

    result = []
    for i in range(weeks):
        ws = first + timedelta(weeks=i)
        result.append(
            {
                "week_start": ws.isoformat(),
                "week_end": (ws + timedelta(days=6)).isoformat(),
                "workouts": workouts.get(ws, 0),
                "logged_exercises": entries.get(ws, 0),
                "duration_minutes": durations.get(ws, 0),
            }
        )
    return result


def category_breakdown(user, period: Period) -> list[dict]:
    rows = (
        WorkoutEntry.objects.filter(workout__user=user, workout__date__range=(period.start, period.end))
        .values("exercise__category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    labels = dict(Exercise.Category.choices)
    return [
        {"category": r["exercise__category"], "label": labels.get(r["exercise__category"], r["exercise__category"]), "logged_exercises": r["count"]}
        for r in rows
    ]


def top_exercises(user, period: Period, limit: int = 5) -> list[dict]:
    rows = (
        WorkoutEntry.objects.filter(workout__user=user, workout__date__range=(period.start, period.end))
        .values("exercise_id", "exercise__name", "exercise__category")
        .annotate(times=Count("id"))
        .order_by("-times", "exercise__name")[:limit]
    )
    return [
        {"exercise_id": r["exercise_id"], "name": r["exercise__name"], "category": r["exercise__category"], "times": r["times"]}
        for r in rows
    ]


def totals(user) -> dict:
    agg = Workout.objects.filter(user=user).aggregate(
        total_workouts=Count("id"),
        total_duration_minutes=Sum("duration_minutes"),
    )
    return {
        "total_workouts": agg["total_workouts"],
        "total_duration_minutes": agg["total_duration_minutes"] or 0,
        "workouts_with_duration": Workout.objects.filter(user=user, duration_minutes__isnull=False).count(),
        "total_logged_exercises": WorkoutEntry.objects.filter(workout__user=user).count(),
    }
