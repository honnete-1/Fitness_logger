import type {
  Category,
  DashboardSummary,
  Exercise,
  MeasurementType,
  Paginated,
  Trends,
  User,
  WeeklyProgress,
  Workout,
  WorkoutInput,
  WorkoutSummary,
} from "../types";
import { localToday, request } from "./client";

export { ApiError, localToday } from "./client";

export const authApi = {
  me: () => request<User>("/api/auth/me/"),
  login: (identifier: string, password: string) =>
    request<User>("/api/auth/login/", { method: "POST", body: { identifier, password } }),
  register: (data: { username: string; email: string; password: string; password_confirm: string }) =>
    request<User>("/api/auth/register/", { method: "POST", body: data }),
  logout: () => request<void>("/api/auth/logout/", { method: "POST" }),
  updateMe: (data: Partial<Pick<User, "username" | "email" | "display_name">>) =>
    request<User>("/api/auth/me/", { method: "PATCH", body: data }),
  updateGoal: (weekly_workout_target: number) =>
    request<{ weekly_workout_target: number }>("/api/goals/", { method: "PATCH", body: { weekly_workout_target } }),
};

export interface ExerciseFilters {
  category?: Category | "";
  search?: string;
}
export interface ExerciseInput {
  name: string;
  description: string;
  category: Category;
  measurement_type: MeasurementType;
}

export const exercisesApi = {
  list: (filters: ExerciseFilters = {}, signal?: AbortSignal) =>
    request<Exercise[]>("/api/exercises/", { query: { ...filters }, signal }),
  create: (data: ExerciseInput) => request<Exercise>("/api/exercises/", { method: "POST", body: data }),
  remove: (id: number) => request<void>(`/api/exercises/${id}/`, { method: "DELETE" }),
};

export interface WorkoutFilters {
  page?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  category?: Category | "";
}

export const workoutsApi = {
  list: (filters: WorkoutFilters = {}, signal?: AbortSignal) =>
    request<Paginated<WorkoutSummary>>("/api/workouts/", { query: { ...filters }, signal }),
  get: (id: number | string, signal?: AbortSignal) => request<Workout>(`/api/workouts/${id}/`, { signal }),
  create: (data: WorkoutInput) => request<Workout>("/api/workouts/", { method: "POST", body: data }),
  update: (id: number | string, data: WorkoutInput) =>
    request<Workout>(`/api/workouts/${id}/`, { method: "PATCH", body: data }),
  remove: (id: number | string) => request<void>(`/api/workouts/${id}/`, { method: "DELETE" }),
};

export const analyticsApi = {
  dashboard: (signal?: AbortSignal) =>
    request<DashboardSummary>("/api/dashboard/summary/", { query: { today: localToday() }, signal }),
  weekly: (signal?: AbortSignal) =>
    request<WeeklyProgress>("/api/progress/weekly/", { query: { today: localToday() }, signal }),
  trends: (weeks: number, signal?: AbortSignal) =>
    request<Trends>("/api/progress/trends/", { query: { weeks, today: localToday() }, signal }),
};
