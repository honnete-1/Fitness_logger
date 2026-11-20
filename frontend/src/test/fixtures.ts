import type { DashboardSummary, Exercise, User, WorkoutSummary } from "../types";

export const user: User = {
  id: 1,
  username: "sam",
  email: "sam@example.com",
  display_name: "Sam",
  date_joined: "2026-10-01T10:00:00Z",
  weekly_workout_target: 3,
};

const ex = (id: number, name: string, category: Exercise["category"], measurement_type: Exercise["measurement_type"]): Exercise => ({
  id,
  name,
  description: "",
  category,
  category_label: category[0].toUpperCase() + category.slice(1),
  measurement_type,
  measurement_label: measurement_type,
  is_custom: false,
  created_at: "2026-01-01T00:00:00Z",
});

export const exercises: Exercise[] = [
  ex(1, "Bench press", "strength", "reps_weight"),
  ex(2, "Push-ups", "bodyweight", "reps"),
  ex(3, "Running", "cardio", "distance"),
  ex(4, "Plank", "bodyweight", "duration"),
];

export const workoutSummary = (overrides: Partial<WorkoutSummary> = {}): WorkoutSummary => ({
  id: 10,
  title: "Monday Upper Body",
  date: "2026-11-16",
  duration_minutes: 45,
  exercise_count: 2,
  exercise_names: ["Push-ups", "Bench press"],
  notes_preview: "Felt strong",
  ...overrides,
});

export const dashboard = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => ({
  today: "2026-11-20",
  week: { start: "2026-11-16", end: "2026-11-22" },
  total_workouts: 12,
  total_duration_minutes: 540,
  workouts_with_duration: 12,
  total_logged_exercises: 31,
  workouts_this_week: 2,
  goal: { weekly_target: 4, completed: 2, remaining: 2, streak_weeks: 3 },
  last_7_days: {
    period: { start: "2026-11-14", end: "2026-11-20" },
    days: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((weekday, i) => ({
      date: `2026-11-${14 + i}`,
      weekday,
      workouts: i === 2 || i === 4 ? 1 : 0,
    })),
  },
  recent_workouts: [workoutSummary()],
  ...overrides,
});
