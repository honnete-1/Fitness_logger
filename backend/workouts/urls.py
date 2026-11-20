from django.urls import path
from rest_framework.routers import DefaultRouter

from exercises.views import ExerciseViewSet

from . import views

router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("workouts", views.WorkoutViewSet, basename="workout")

urlpatterns = [
    path("dashboard/summary/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("progress/weekly/", views.WeeklyProgressView.as_view(), name="progress-weekly"),
    path("progress/trends/", views.TrendsView.as_view(), name="progress-trends"),
    *router.urls,
]
