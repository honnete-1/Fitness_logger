from django.db.models.functions import Lower
from rest_framework import serializers

from .models import Exercise


class ExerciseSerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    measurement_label = serializers.CharField(source="get_measurement_type_display", read_only=True)

    class Meta:
        model = Exercise
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_label",
            "measurement_type",
            "measurement_label",
            "is_custom",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_is_custom(self, obj: Exercise) -> bool:
        return obj.owner_id is not None

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        user = self.context["request"].user
        # A custom exercise may not duplicate a built-in one or another of the user's own.
        clash = Exercise.objects.annotate(lname=Lower("name")).filter(lname=value.lower())
        clash = clash.filter(owner__isnull=True) | clash.filter(owner=user)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("An exercise with this name already exists.")
        return value

    def validate_description(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        # Changing the measurement type would make existing logged entries invalid.
        if (
            self.instance is not None
            and "measurement_type" in attrs
            and attrs["measurement_type"] != self.instance.measurement_type
            and self.instance.workout_entries.exists()
        ):
            raise serializers.ValidationError(
                {"measurement_type": ["Cannot change how this exercise is measured after it has been logged."]}
            )
        return attrs
