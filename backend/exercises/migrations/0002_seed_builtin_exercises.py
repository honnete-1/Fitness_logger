from django.db import migrations


def seed_exercises(apps, schema_editor):
    from exercises.management.commands.seed_exercises import seed

    seed(apps.get_model("exercises", "Exercise"))


def unseed_exercises(apps, schema_editor):
    from exercises.seed_data import EXERCISES

    Exercise = apps.get_model("exercises", "Exercise")
    Exercise.objects.filter(owner__isnull=True, name__in=[e[0] for e in EXERCISES]).delete()


class Migration(migrations.Migration):
    dependencies = [("exercises", "0001_initial")]

    operations = [migrations.RunPython(seed_exercises, unseed_exercises)]
