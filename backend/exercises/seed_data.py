"""Built-in exercise library. Loaded by migration 0002 and `manage.py seed_exercises`."""

S, C, F, M, B = "strength", "cardio", "flexibility", "mobility", "bodyweight"
REPS, REPS_W, DUR, DIST = "reps", "reps_weight", "duration", "distance"

EXERCISES: list[tuple[str, str, str, str]] = [
    # name, category, measurement_type, description
    ("Bench press", S, REPS_W, "Press a barbell from chest to full arm extension while lying on a bench."),
    ("Dumbbell curl", S, REPS_W, "Curl dumbbells toward your shoulders, keeping elbows close to your sides."),
    ("Shoulder press", S, REPS_W, "Press dumbbells or a barbell overhead from shoulder height."),
    ("Deadlift", S, REPS_W, "Lift a barbell from the floor to hip height with a neutral spine."),
    ("Barbell back squat", S, REPS_W, "Squat with a barbell resting across your upper back."),
    ("Bent-over row", S, REPS_W, "Row a barbell or dumbbells toward your torso while hinged at the hips."),
    ("Lat pulldown", S, REPS_W, "Pull a cable bar down to your upper chest while seated."),
    ("Goblet squat", S, REPS_W, "Squat while holding a dumbbell or kettlebell at your chest."),
    ("Romanian deadlift", S, REPS_W, "Hinge at the hips with soft knees to lower the weight along your legs."),
    ("Push-ups", B, REPS, "Lower your chest toward the floor and press back up with a straight body."),
    ("Squats", B, REPS, "Bodyweight squat: hips back and down, then stand tall."),
    ("Lunges", B, REPS, "Step forward and lower both knees to about 90 degrees, then return."),
    ("Plank", B, DUR, "Hold a straight-body position on your forearms and toes."),
    ("Glute bridge", B, REPS, "Lie on your back and lift your hips by squeezing your glutes."),
    ("Pull-ups", B, REPS, "Hang from a bar and pull your chin above it."),
    ("Burpees", B, REPS, "Squat, kick back to a plank, return and jump up."),
    ("Running", C, DIST, "Outdoor or treadmill running."),
    ("Walking", C, DIST, "Brisk walking outdoors or on a treadmill."),
    ("Cycling", C, DIST, "Outdoor or stationary cycling."),
    ("Jump rope", C, DUR, "Continuous skipping with a rope."),
    ("Rowing machine", C, DIST, "Indoor rowing on an ergometer."),
    ("Swimming", C, DIST, "Laps in a pool or open water."),
    ("Hamstring stretch", F, DUR, "Gently reach toward your toes with straight legs."),
    ("Hip flexor stretch", F, DUR, "Kneeling lunge stretch for the front of the hip."),
    ("Quad stretch", F, DUR, "Pull your heel toward your glutes while standing tall."),
    ("Yoga flow", F, DUR, "A sequence of yoga poses linked with the breath."),
    ("Shoulder mobility", M, DUR, "Arm circles, band pull-aparts and wall slides."),
    ("Hip circles", M, DUR, "Controlled circular movements to open the hips."),
    ("Cat-cow", M, DUR, "Alternate between arching and rounding the spine on all fours."),
]
