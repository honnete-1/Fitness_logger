from django.contrib import admin

from .models import Exercise


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "measurement_type", "owner")
    list_filter = ("category", "measurement_type")
    search_fields = ("name",)
