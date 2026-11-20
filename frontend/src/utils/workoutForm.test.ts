import { describe, expect, it } from "vitest";
import { exercises } from "../test/fixtures";
import { emptyDraft, newEntry, newSet, serverErrorsToForm, toPayload, validateDraft, type WorkoutDraft } from "./workoutForm";

const [bench, pushups, running, plank] = exercises;
const TODAY = "2026-11-20";

function draft(overrides: Partial<WorkoutDraft> = {}): WorkoutDraft {
  return { ...emptyDraft(TODAY), title: "Leg day", ...overrides };
}

describe("validateDraft", () => {
  it("requires a title and at least one exercise", () => {
    const errors = validateDraft({ ...emptyDraft(TODAY) }, TODAY);
    expect(errors.title).toMatch(/title/i);
    expect(errors.entries).toMatch(/at least one exercise/i);
  });

  it("rejects future dates and invalid session durations", () => {
    expect(validateDraft(draft({ date: "2026-11-21" }), TODAY).date).toMatch(/future/);
    expect(validateDraft(draft({ duration: "0" }), TODAY).duration).toBeDefined();
    expect(validateDraft(draft({ duration: "12.5" }), TODAY).duration).toBeDefined();
    expect(validateDraft(draft({ duration: "1441" }), TODAY).duration).toBeDefined();
  });

  it("validates reps and weights per set", () => {
    const entry = newEntry(bench);
    entry.sets = [
      { ...newSet(), reps: "", weight: "20" },
      { ...newSet(), reps: "0", weight: "-5" },
      { ...newSet(), reps: "8", weight: "1000.5" },
      { ...newSet(), reps: "10", weight: "" },
    ];
    const errors = validateDraft(draft({ entries: [entry] }), TODAY);
    expect(errors["entries.0.sets.0.reps"]).toBe("Enter reps.");
    expect(errors["entries.0.sets.1.reps"]).toMatch(/whole number/);
    expect(errors["entries.0.sets.1.weight_kg"]).toMatch(/negative/);
    expect(errors["entries.0.sets.2.weight_kg"]).toMatch(/at most 1000/);
    expect(errors["entries.0.sets.3.reps"]).toBeUndefined();
    expect(errors["entries.0.sets.3.weight_kg"]).toBeUndefined(); // weight is optional
  });

  it("requires sets for set-based exercises", () => {
    const entry = { ...newEntry(pushups), sets: [] };
    expect(validateDraft(draft({ entries: [entry] }), TODAY)["entries.0.sets"]).toMatch(/at least one set/);
  });

  it("requires duration or distance for the matching measurement types", () => {
    const errors = validateDraft(draft({ entries: [newEntry(running), newEntry(plank)] }), TODAY);
    expect(errors["entries.0.distance_km"]).toMatch(/distance/);
    expect(errors["entries.0.duration_minutes"]).toBeUndefined(); // optional for distance
    expect(errors["entries.1.duration_minutes"]).toMatch(/duration/);
  });

  it("passes a valid workout", () => {
    const push = newEntry(pushups);
    push.sets[0].reps = "12";
    const run = { ...newEntry(running), distance: "5,2", duration: "30" };
    expect(validateDraft(draft({ entries: [push, run] }), TODAY)).toEqual({});
  });
});

describe("toPayload", () => {
  it("sends only the fields each measurement type uses", () => {
    const b = newEntry(bench);
    b.sets = [{ ...newSet(), reps: "8", weight: "42.5" }, { ...newSet(), reps: "6", weight: "" }];
    const p = newEntry(pushups);
    p.sets[0].reps = "15";
    const r = { ...newEntry(running), distance: "5,25", duration: "" };
    const pl = { ...newEntry(plank), duration: "2" };

    const payload = toPayload(draft({ title: "  Mixed  ", duration: "60", entries: [b, p, r, pl] }));
    expect(payload.title).toBe("Mixed");
    expect(payload.duration_minutes).toBe(60);
    expect(payload.entries).toEqual([
      { exercise_id: 1, notes: "", sets: [{ reps: 8, weight_kg: "42.5" }, { reps: 6, weight_kg: null }] },
      { exercise_id: 2, notes: "", sets: [{ reps: 15 }] },
      { exercise_id: 3, notes: "", distance_km: "5.25", duration_minutes: null },
      { exercise_id: 4, notes: "", duration_minutes: "2" },
    ]);
  });

  it("sends null for an empty session duration", () => {
    expect(toPayload(draft()).duration_minutes).toBeNull();
  });
});

describe("serverErrorsToForm", () => {
  it("maps server field paths onto form keys", () => {
    expect(
      serverErrorsToForm({
        title: ["Give your workout a title."],
        duration_minutes: ["Too long."],
        "entries.0.non_field_errors": ["Wrong type."],
        "entries.1.sets.0.reps": ["Must be positive."],
      }),
    ).toEqual({
      title: "Give your workout a title.",
      duration: "Too long.",
      "entries.0": "Wrong type.",
      "entries.1.sets.0.reps": "Must be positive.",
    });
  });
});
