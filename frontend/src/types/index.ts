/** Types mirroring the Django REST API (see docs/API.md). Decimals arrive as strings. */

export type Category = "strength" | "cardio" | "flexibility" | "mobility" | "bodyweight";
export type MeasurementType = "reps" | "reps_weight" | "duration" | "distance";

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  date_joined: string;
  weekly_workout_target: number;
}

export interface Exercise {
  id: number;
  name: string;
  description: string;
  category: Category;
  category_label: string;
  measurement_type: MeasurementType;
  measurement_label: string;
  is_custom: boolean;
  created_at: string;
}

export interface ExerciseSet {
  id: number;
  set_number: number;
  reps: number;
  weight_kg: string | null;
}

export interface WorkoutEntry {
  id: number;
  exercise: Exercise;
  order: number;
  duration_minutes: string | null;
  distance_km: string | null;
  notes: string;
  sets: ExerciseSet[];
}

export interface Workout {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  notes: string;
  duration_minutes: number | null;
  entries: WorkoutEntry[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutSummary {
  id: number;
  title: string;
  date: string;
  duration_minutes: number | null;
  exercise_count: number;
  exercise_names: string[];
  notes_preview: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* Write payloads */
export interface SetInput {
  reps: number;
  weight_kg?: string | null;
}
export interface EntryInput {
  exercise_id: number;
  duration_minutes?: string | null;
  distance_km?: string | null;
  notes?: string;
  sets?: SetInput[];
}
export interface WorkoutInput {
  title: string;
  date: string;
  notes: string;
  duration_minutes: number | null;
  entries: EntryInput[];
}

/* Analytics */
export interface Period {
  start: string;
  end: string;
}
export interface DayCount {
  date: string;
  weekday: string;
  workouts: number;
}
export interface Totals {
  total_workouts: number;
  total_duration_minutes: number;
  workouts_with_duration: number;
  total_logged_exercises: number;
}
export interface DashboardSummary extends Totals {
  today: string;
  week: Period;
  workouts_this_week: number;
  goal: { weekly_target: number; completed: number; remaining: number; streak_weeks: number };
  last_7_days: { period: Period; days: DayCount[] };
  recent_workouts: WorkoutSummary[];
}
export interface WeeklyProgress {
  today: string;
  period: Period;
  days: DayCount[];
  total_workouts: number;
  active_days: number;
}
export interface WeekTrend {
  week_start: string;
  week_end: string;
  workouts: number;
  logged_exercises: number;
  duration_minutes: number;
}
export interface Trends {
  today: string;
  period: Period;
  weeks: WeekTrend[];
  total_workouts: number;
  average_per_week: number;
  active_weeks: number;
  weekly_target: number;
  categories: { category: Category; label: string; logged_exercises: number }[];
  top_exercises: { exercise_id: number; name: string; category: Category; times: number }[];
  all_time: Totals;
}
