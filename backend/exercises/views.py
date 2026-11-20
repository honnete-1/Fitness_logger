from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import Exercise
from .serializers import ExerciseSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Built-in exercises are read-only; custom ones can be changed by their owner only."""

    message = "Built-in exercises cannot be modified."

    def has_object_permission(self, request, view, obj: Exercise) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id


class ExerciseViewSet(viewsets.ModelViewSet):
    """
    GET    /api/exercises/?category=&search=&measurement_type=&custom=true
    POST   /api/exercises/            create a custom exercise
    PATCH  /api/exercises/{id}/       update own custom exercise
    DELETE /api/exercises/{id}/       delete own custom exercise (if never logged)

    The library is small (tens of rows), so it is returned unpaginated.
    """

    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Exercise.objects.filter(Q(owner__isnull=True) | Q(owner=user))
        params = self.request.query_params
        if category := params.get("category"):
            qs = qs.filter(category=category)
        if measurement := params.get("measurement_type"):
            qs = qs.filter(measurement_type=measurement)
        if search := params.get("search", "").strip():
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if params.get("custom") == "true":
            qs = qs.filter(owner=user)
        return qs.order_by("name")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        exercise = self.get_object()
        if exercise.workout_entries.exists():
            return Response(
                {"detail": "This exercise is used in logged workouts and cannot be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        exercise.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
