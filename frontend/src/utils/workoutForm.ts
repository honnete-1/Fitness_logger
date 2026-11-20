/**
 * Workout form state, validation and (de)serialisation.
 * Kept free of React so it can be unit-tested directly.
 * Limits mirror the backend (backend/workouts/models.py); the backend remains
 * the source of truth.
 */
import type { EntryInput, Exercise, MeasurementType, Workout, WorkoutInput } from "../types";
import { trimNumber } from "./format";

export const LIMITS = {
  titleMax: 100,
  notesMax: 2000,
  entryNotesMax: 500,
  sessionMinutesMax: 1440,
  repsMax: 1000,
  weightMax: 1000,
  distanceMax: 1000,
  setsMax: 50,
  entriesMax: 30,
} as const;

export interface SetDraft {
  key: string;
  reps: string;
  weight: string;
}

export interface EntryDraft {
  key: string;
  exercise: Exercise;
  sets: SetDraft[];
  duration: string;
  distance: string;
  notes: string;
}

export interface WorkoutDraft {
  title: string;
  date: string;
  notes: string;
  duration: string;
  entries: EntryDraft[];
}

export type FormErrors = Record<string, string>;

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

export const usesSets = (t: MeasurementType) => t === "reps" || t === "reps_weight";

export function newSet(from?: SetDraft): SetDraft {
  return { key: nextKey(), reps: from?.reps ?? "", weight: from?.weight ?? "" };
}

export function newEntry(exercise: Exercise): EntryDraft {
  return {
    key: nextKey(),
    exercise,
    sets: usesSets(exercise.measurement_type) ? [newSet()] : [],
    duration: "",
    distance: "",
    notes: "",
  };
}

export function emptyDraft(today: string): WorkoutDraft {
  return { title: "", date: today, notes: "", duration: "", entries: [] };
}

export function draftFromWorkout(w: Workout): WorkoutDraft {
  return {
    title: w.title,
    date: w.date,
    notes: w.notes,
    duration: w.duration_minutes != null ? String(w.duration_minutes) : "",
    entries: w.entries.map((e) => ({
      key: nextKey(),
      exercise: e.exercise,
      notes: e.notes,
      duration: e.duration_minutes != null ? trimNumber(e.duration_minutes) : "",
      distance: e.distance_km != null ? trimNumber(e.distance_km) : "",
      sets: e.sets.map((s) => ({
        key: nextKey(),
        reps: String(s.reps),
        weight: s.weight_kg != null ? trimNumber(s.weight_kg) : "",
      })),
    })),
  };
}

const isBlank = (v: string) => v.trim() === "";
const num = (v: string) => Number(v.trim().replace(",", "."));
const isDecimal = (v: string) => /^\d+([.,]\d{1,2})?$/.test(v.trim());

function checkDecimal(value: string, { label, min, max, allowZero = false }: { label: string; min: number; max: number; allowZero?: boolean }): string | null {
  if (value.trim().startsWith("-")) return `${label} can't be negative.`;
  if (!isDecimal(value)) return `${label} must be a number with up to 2 decimals.`;
  const n = num(value);
  if (allowZero ? n < 0 : n <= 0) return `${label} must be ${allowZero ? "zero or more" : "greater than zero"}.`;
  if (n < min || n > max) return `${label} must be at most ${max}.`;
  return null;
}

export function validateDraft(draft: WorkoutDraft, today: string): FormErrors {
  const errors: FormErrors = {};
  if (isBlank(draft.title)) errors.title = "Give your workout a title.";
  else if (draft.title.trim().length > LIMITS.titleMax) errors.title = `Keep the title under ${LIMITS.titleMax} characters.`;

  if (!draft.date) errors.date = "Choose the date of your workout.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date))) errors.date = "Enter a valid date.";
  else if (draft.date > today) errors.date = "Workout date cannot be in the future.";
  else if (draft.date < "2000-01-01") errors.date = "Enter a date from the year 2000 onward.";

  if (!isBlank(draft.duration)) {
    const n = Number(draft.duration);
    if (!/^\d+$/.test(draft.duration.trim()) || n < 1 || n > LIMITS.sessionMinutesMax)
      errors.duration = `Enter whole minutes between 1 and ${LIMITS.sessionMinutesMax}.`;
  }
  if (draft.notes.length > LIMITS.notesMax) errors.notes = `Notes can be up to ${LIMITS.notesMax} characters.`;

  if (draft.entries.length === 0) errors.entries = "Add at least one exercise to your workout.";
  if (draft.entries.length > LIMITS.entriesMax) errors.entries = `A workout can contain at most ${LIMITS.entriesMax} exercises.`;

  draft.entries.forEach((entry, i) => {
    const p = `entries.${i}`;
    const type = entry.exercise.measurement_type;
    if (usesSets(type)) {
      if (entry.sets.length === 0) errors[`${p}.sets`] = "Add at least one set.";
      if (entry.sets.length > LIMITS.setsMax) errors[`${p}.sets`] = `At most ${LIMITS.setsMax} sets.`;
      entry.sets.forEach((s, j) => {
        const sp = `${p}.sets.${j}`;
        if (isBlank(s.reps)) errors[`${sp}.reps`] = "Enter reps.";
        else if (!/^\d+$/.test(s.reps.trim()) || Number(s.reps) < 1) errors[`${sp}.reps`] = "Reps must be a whole number above 0.";
        else if (Number(s.reps) > LIMITS.repsMax) errors[`${sp}.reps`] = `At most ${LIMITS.repsMax} reps.`;
        if (type === "reps_weight" && !isBlank(s.weight)) {
          const err = checkDecimal(s.weight, { label: "Weight", min: 0, max: LIMITS.weightMax, allowZero: true });
          if (err) errors[`${sp}.weight_kg`] = err;
        }
      });
    }
    if (type === "duration") {
      if (isBlank(entry.duration)) errors[`${p}.duration_minutes`] = "Enter the duration in minutes.";
      else {
        const err = checkDecimal(entry.duration, { label: "Duration", min: 0.01, max: LIMITS.sessionMinutesMax });
        if (err) errors[`${p}.duration_minutes`] = err;
      }
    }
    if (type === "distance") {
      if (isBlank(entry.distance)) errors[`${p}.distance_km`] = "Enter the distance in kilometres.";
      else {
        const err = checkDecimal(entry.distance, { label: "Distance", min: 0.01, max: LIMITS.distanceMax });
        if (err) errors[`${p}.distance_km`] = err;
      }
      if (!isBlank(entry.duration)) {
        const err = checkDecimal(entry.duration, { label: "Duration", min: 0.01, max: LIMITS.sessionMinutesMax });
        if (err) errors[`${p}.duration_minutes`] = err;
      }
    }
    if (entry.notes.length > LIMITS.entryNotesMax) errors[`${p}.notes`] = `Up to ${LIMITS.entryNotesMax} characters.`;
  });
  return errors;
}

const decimalOrNull = (v: string) => (isBlank(v) ? null : String(num(v)));

export function toPayload(draft: WorkoutDraft): WorkoutInput {
  return {
    title: draft.title.trim(),
    date: draft.date,
    notes: draft.notes.trim(),
    duration_minutes: isBlank(draft.duration) ? null : Number(draft.duration),
    entries: draft.entries.map((e): EntryInput => {
      const type = e.exercise.measurement_type;
      const base: EntryInput = { exercise_id: e.exercise.id, notes: e.notes.trim() };
      if (usesSets(type)) {
        base.sets = e.sets.map((s) => ({
          reps: Number(s.reps),
          ...(type === "reps_weight" ? { weight_kg: decimalOrNull(s.weight) } : {}),
        }));
      } else if (type === "duration") {
        base.duration_minutes = decimalOrNull(e.duration);
      } else {
        base.distance_km = decimalOrNull(e.distance);
        base.duration_minutes = decimalOrNull(e.duration);
      }
      return base;
    }),
  };
}

/** Convert server field errors ("entries.0.sets.1.reps": [...]) into form errors. */
export function serverErrorsToForm(fieldErrors: Record<string, string[]>): FormErrors {
  const out: FormErrors = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    const mapped = key === "duration_minutes" ? "duration" : key.replace(/\.non_field_errors$/, "");
    out[mapped] = msgs.join(" ");
  }
  return out;
}
