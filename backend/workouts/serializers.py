from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from exercises.models import Exercise
from exercises.serializers import ExerciseSerializer

from .models import (
    MAX_DISTANCE_KM,
    MAX_ENTRIES,
    MAX_REPS,
    MAX_SESSION_MINUTES,
    MAX_SETS,
    MAX_WEIGHT_KG,
    ExerciseSet,
    Workout,
    WorkoutEntry,
)

M = Exercise.MeasurementType


class ExerciseSetSerializer(serializers.ModelSerializer):
    reps = serializers.IntegerField(min_value=1, max_value=MAX_REPS)
    weight_kg = serializers.DecimalField(
        max_digits=6, decimal_places=2, min_value=Decimal("0"), max_value=MAX_WEIGHT_KG, required=False, allow_null=True
    )

    class Meta:
        model = ExerciseSet
        fields = ["id", "set_number", "reps", "weight_kg"]
        read_only_fields = ["id", "set_number"]  # set_number is derived from list position


class AccessibleExerciseField(serializers.PrimaryKeyRelatedField):
    """Only built-in exercises and the requesting user's own custom exercises are valid."""

    default_error_messages = {
        "does_not_exist": "Exercise {pk_value} does not exist.",
        "incorrect_type": "Exercise must be referenced by its numeric id.",
    }

    def get_queryset(self):
        user = self.context["request"].user
        return Exercise.objects.filter(Q(owner__isnull=True) | Q(owner=user))


class WorkoutEntrySerializer(serializers.ModelSerializer):
    exercise_id = AccessibleExerciseField(source="exercise", write_only=True)
    exercise = ExerciseSerializer(read_only=True)
    sets = ExerciseSetSerializer(many=True, required=False)
    duration_minutes = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=Decimal(MAX_SESSION_MINUTES),
        required=False,
        allow_null=True,
    )
    distance_km = serializers.DecimalField(
        max_digits=7,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=MAX_DISTANCE_KM,
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    class Meta:
        model = WorkoutEntry
        fields = ["id", "exercise_id", "exercise", "order", "duration_minutes", "distance_km", "notes", "sets"]
        read_only_fields = ["id", "order"]

    def validate(self, attrs):
        """Enforce which measurements each exercise type requires or forbids."""
        exercise: Exercise = attrs["exercise"]
        sets = attrs.get("sets") or []
        duration = attrs.get("duration_minutes")
        distance = attrs.get("distance_km")
        errors: dict[str, list[str]] = {}
        mtype = exercise.measurement_type

        if mtype in (M.REPS, M.REPS_WEIGHT):
            if not sets:
                errors["sets"] = [f"Add at least one set for {exercise.name}."]
            elif len(sets) > MAX_SETS:
                errors["sets"] = [f"A single exercise can have at most {MAX_SETS} sets."]
            if mtype == M.REPS and any(s.get("weight_kg") is not None for s in sets):
                errors["sets"] = [f"{exercise.name} is a bodyweight exercise and does not take a weight."]
            if duration is not None or distance is not None:
                errors["non_field_errors"] = [f"{exercise.name} is tracked with sets and reps, not duration or distance."]
        elif mtype == M.DURATION:
            if duration is None:
                errors["duration_minutes"] = [f"Enter how many minutes of {exercise.name} you did."]
            if sets or distance is not None:
                errors["non_field_errors"] = [f"{exercise.name} is tracked by duration only."]
        elif mtype == M.DISTANCE:
            if distance is None:
                errors["distance_km"] = [f"Enter the distance for {exercise.name}."]
            if sets:
                errors["sets"] = [f"{exercise.name} is tracked by distance, not sets."]

        if errors:
            raise serializers.ValidationError(errors)
        attrs["sets"] = sets
        return attrs


class WorkoutSerializer(serializers.ModelSerializer):
    """Full workout with nested entries and sets. Writes are atomic."""

    entries = WorkoutEntrySerializer(many=True)
    title = serializers.CharField(max_length=100)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(
        min_value=1, max_value=MAX_SESSION_MINUTES, required=False, allow_null=True
    )

    class Meta:
        model = Workout
        fields = ["id", "title", "date", "notes", "duration_minutes", "entries", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give your workout a title.")
        return value

    def validate_notes(self, value: str) -> str:
        return value.strip()

    def validate_date(self, value):
        # Allow one day of slack for users in time zones ahead of the server.
        latest = timezone.localdate() + timedelta(days=1)
        if value > latest:
            raise serializers.ValidationError("Workout date cannot be in the future.")
        if value.year < 2000:
            raise serializers.ValidationError("Enter a date from the year 2000 onward.")
        return value

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one exercise to your workout.")
        if len(value) > MAX_ENTRIES:
            raise serializers.ValidationError(f"A workout can contain at most {MAX_ENTRIES} exercises.")
        return value

    # -- persistence ---------------------------------------------------------

    @staticmethod
    def _write_entries(workout: Workout, entries_data: list[dict]) -> None:
        for order, entry_data in enumerate(entries_data):
            sets_data = entry_data.pop("sets", [])
            entry = WorkoutEntry.objects.create(workout=workout, order=order, **entry_data)
            ExerciseSet.objects.bulk_create(
                ExerciseSet(entry=entry, set_number=i, reps=s["reps"], weight_kg=s.get("weight_kg"))
                for i, s in enumerate(sets_data, start=1)
            )

    @transaction.atomic
    def create(self, validated_data):
        entries_data = validated_data.pop("entries")
        workout = Workout.objects.create(**validated_data)
        self._write_entries(workout, entries_data)
        return workout

    @transaction.atomic
    def update(self, instance: Workout, validated_data):
        entries_data = validated_data.pop("entries", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if entries_data is not None:
            # The submitted list is the complete new state of the workout.
            # Replacing entries keeps ordering and set numbering consistent and
            # avoids partial-merge edge cases; it all happens in one transaction.
            instance.entries.all().delete()
            self._write_entries(instance, entries_data)
        return instance

    def to_representation(self, instance):
        # Re-read with prefetches so nested data reflects what was just saved.
        if not hasattr(instance, "_prefetched_objects_cache"):
            instance = Workout.objects.prefetch_related("entries__exercise", "entries__sets").get(pk=instance.pk)
        return super().to_representation(instance)


class WorkoutListSerializer(serializers.ModelSerializer):
    """Compact representation for history lists and dashboards."""

    exercise_count = serializers.IntegerField(read_only=True)
    exercise_names = serializers.SerializerMethodField()
    notes_preview = serializers.SerializerMethodField()

    class Meta:
        model = Workout
        fields = ["id", "title", "date", "duration_minutes", "exercise_count", "exercise_names", "notes_preview"]

    def get_exercise_names(self, obj: Workout) -> list[str]:
        return [entry.exercise.name for entry in obj.entries.all()]

    def get_notes_preview(self, obj: Workout) -> str:
        notes = obj.notes.strip()
        return notes if len(notes) <= 120 else notes[:117].rstrip() + "…"
