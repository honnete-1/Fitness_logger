from django.contrib import admin

from .models import ExerciseSet, Workout, WorkoutEntry


class ExerciseSetInline(admin.TabularInline):
    model = ExerciseSet
    extra = 0


class WorkoutEntryInline(admin.StackedInline):
    model = WorkoutEntry
    extra = 0
    show_change_link = True


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "date", "duration_minutes")
    list_filter = ("date",)
    search_fields = ("title", "user__username")
    inlines = [WorkoutEntryInline]


@admin.register(WorkoutEntry)
class WorkoutEntryAdmin(admin.ModelAdmin):
    list_display = ("workout", "exercise", "order")
    inlines = [ExerciseSetInline]
