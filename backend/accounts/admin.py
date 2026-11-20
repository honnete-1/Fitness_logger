from django.contrib import admin

from .models import UserGoal


@admin.register(UserGoal)
class UserGoalAdmin(admin.ModelAdmin):
    list_display = ("user", "weekly_workout_target", "updated_at")
    search_fields = ("user__username", "user__email")
