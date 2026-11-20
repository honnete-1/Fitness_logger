from datetime import date, timedelta

from django.db.models import Count, Prefetch
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserGoal

from . import analytics
from .models import Workout, WorkoutEntry
from .serializers import WorkoutListSerializer, WorkoutSerializer


def _parse_date_param(params, name: str) -> date | None:
    raw = params.get(name)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError({name: ["Use the format YYYY-MM-DD."]}) from exc


def list_queryset(user):
    """Compact workouts with exercise names, without N+1 queries."""
    return (
        Workout.objects.filter(user=user)
        .annotate(exercise_count=Count("entries", distinct=True))
        .prefetch_related(Prefetch("entries", queryset=WorkoutEntry.objects.select_related("exercise")))
    )


class WorkoutViewSet(viewsets.ModelViewSet):
    """
    GET    /api/workouts/?search=&date_from=&date_to=&category=&page=
    POST   /api/workouts/
    GET    /api/workouts/{id}/
    PATCH  /api/workouts/{id}/
    DELETE /api/workouts/{id}/

    The queryset is always scoped to request.user, so another user's workout
    is indistinguishable from a missing one (404).
    """

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        return WorkoutListSerializer if self.action == "list" else WorkoutSerializer

    def get_queryset(self):
        user = self.request.user
        if self.action != "list":
            return Workout.objects.filter(user=user).prefetch_related(
                Prefetch(
                    "entries",
                    queryset=WorkoutEntry.objects.select_related("exercise").prefetch_related("sets"),
                )
            )

        qs = list_queryset(user)
        params = self.request.query_params
        if search := params.get("search", "").strip():
            qs = qs.filter(title__icontains=search)
        date_from = _parse_date_param(params, "date_from")
        date_to = _parse_date_param(params, "date_to")
        if date_from and date_to and date_from > date_to:
            raise ValidationError({"date_to": ["End date must be on or after the start date."]})
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if category := params.get("category"):
            qs = qs.filter(entries__exercise__category=category).distinct()
        return qs.order_by("-date", "-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def _target_for(user) -> int:
    goal = UserGoal.objects.filter(user=user).first()
    return goal.weekly_workout_target if goal else 3


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/?today=YYYY-MM-DD"""

    def get(self, request):
        user = request.user
        today = analytics.resolve_today(request.query_params.get("today"))
        week = analytics.Period(analytics.start_of_week(today), analytics.start_of_week(today) + timedelta(days=6))
        last_7 = analytics.Period(today - timedelta(days=6), today)

        this_week = Workout.objects.filter(user=user, date__range=(week.start, week.end)).count()
        target = _target_for(user)
        recent = list_queryset(user).order_by("-date", "-created_at")[:5]

        return Response(
            {
                "today": today.isoformat(),
                "week": week.as_dict(),
                **analytics.totals(user),
                "workouts_this_week": this_week,
                "goal": {
                    "weekly_target": target,
                    "completed": this_week,
                    "remaining": max(target - this_week, 0),
                    "streak_weeks": analytics.goal_streak(user, target, today),
                },
                "last_7_days": {"period": last_7.as_dict(), "days": analytics.daily_counts(user, last_7)},
                "recent_workouts": WorkoutListSerializer(recent, many=True).data,
            }
        )


class WeeklyProgressView(APIView):
    """GET /api/progress/weekly/?today=YYYY-MM-DD — the current Monday–Sunday week, per day."""

    def get(self, request):
        today = analytics.resolve_today(request.query_params.get("today"))
        start = analytics.start_of_week(today)
        week = analytics.Period(start, start + timedelta(days=6))
        days = analytics.daily_counts(request.user, week)
        return Response(
            {
                "today": today.isoformat(),
                "period": week.as_dict(),
                "days": days,
                "total_workouts": sum(d["workouts"] for d in days),
                "active_days": sum(1 for d in days if d["workouts"] > 0),
            }
        )


class TrendsView(APIView):
    """GET /api/progress/trends/?weeks=8&today=YYYY-MM-DD"""

    def get(self, request):
        try:
            weeks = int(request.query_params.get("weeks", 8))
        except ValueError as exc:
            raise ValidationError({"weeks": ["Must be a whole number."]}) from exc
        if not 1 <= weeks <= analytics.MAX_TREND_WEEKS:
            raise ValidationError({"weeks": [f"Must be between 1 and {analytics.MAX_TREND_WEEKS}."]})

        user = request.user
        today = analytics.resolve_today(request.query_params.get("today"))
        trend = analytics.weekly_trend(user, weeks, today)
        period = analytics.Period(date.fromisoformat(trend[0]["week_start"]), date.fromisoformat(trend[-1]["week_end"]))
        total = sum(w["workouts"] for w in trend)
        return Response(
            {
                "today": today.isoformat(),
                "period": period.as_dict(),
                "weeks": trend,
                "total_workouts": total,
                "average_per_week": round(total / weeks, 1),
                "active_weeks": sum(1 for w in trend if w["workouts"] > 0),
                "weekly_target": _target_for(user),
                "categories": analytics.category_breakdown(user, period),
                "top_exercises": analytics.top_exercises(user, period),
                "all_time": analytics.totals(user),
            }
        )
