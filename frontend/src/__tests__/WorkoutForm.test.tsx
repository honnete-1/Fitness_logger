import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, exercisesApi } from "../api";
import { WorkoutForm } from "../components/workouts/WorkoutForm";
import { exercises } from "../test/fixtures";
import type { WorkoutInput } from "../types";
import { emptyDraft } from "../utils/workoutForm";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, localToday: () => "2026-11-20", exercisesApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(exercisesApi.list).mockResolvedValue(exercises);
});

function setup(onSubmit = vi.fn<(p: WorkoutInput) => Promise<void>>().mockResolvedValue(undefined)) {
  render(<WorkoutForm initial={emptyDraft("2026-11-20")} submitLabel="Save workout" onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { onSubmit, user: userEvent.setup() };
}

async function addExercise(user: ReturnType<typeof userEvent.setup>, name: string) {
  // The picker starts open (while exercises load); afterwards it is reopened via "Add exercise".
  const openButton = screen.queryByRole("button", { name: "Add exercise" });
  if (openButton) await user.click(openButton);
  const picker = await screen.findByRole("region", { name: "Choose an exercise" });
  await user.click(await within(picker).findByRole("button", { name: new RegExp(`Add ${name}`) }));
}

describe("WorkoutForm", () => {
  it("lists exercises and filters them by search", async () => {
    const { user } = setup();
    const picker = await screen.findByRole("region", { name: "Choose an exercise" });
    expect(within(picker).getByText("Bench press")).toBeInTheDocument();
    await user.type(within(picker).getByLabelText("Search exercises"), "run");
    expect(within(picker).queryByText("Bench press")).not.toBeInTheDocument();
    expect(within(picker).getByText("Running")).toBeInTheDocument();
  });

  it("shows inputs that match the exercise's measurement type", async () => {
    const { user } = setup();
    await addExercise(user, "Bench press");
    expect(screen.getByLabelText("Bench press set 1 reps")).toBeInTheDocument();
    expect(screen.getByLabelText("Bench press set 1 weight in kilograms")).toBeInTheDocument();

    await addExercise(user, "Push-ups");
    expect(screen.getByLabelText("Push-ups set 1 reps")).toBeInTheDocument();
    expect(screen.queryByLabelText("Push-ups set 1 weight in kilograms")).not.toBeInTheDocument();

    await addExercise(user, "Running");
    expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Running set 1/)).not.toBeInTheDocument();
  });

  it("adds and removes sets", async () => {
    const { user } = setup();
    await addExercise(user, "Push-ups");
    await user.type(screen.getByLabelText("Push-ups set 1 reps"), "12");
    // The only set can't be removed
    expect(screen.getByRole("button", { name: "Remove set 1 of Push-ups" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add set" }));
    await user.click(screen.getByRole("button", { name: "Add set" }));
    expect(screen.getByLabelText("Push-ups set 3 reps")).toHaveValue("12"); // copies previous set

    await user.clear(screen.getByLabelText("Push-ups set 2 reps"));
    await user.type(screen.getByLabelText("Push-ups set 2 reps"), "10");
    await user.click(screen.getByRole("button", { name: "Remove set 1 of Push-ups" }));
    expect(screen.queryByLabelText("Push-ups set 3 reps")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Push-ups set 1 reps")).toHaveValue("10");
  });

  it("removes an exercise", async () => {
    const { user } = setup();
    await addExercise(user, "Push-ups");
    await user.click(screen.getByRole("button", { name: "Remove Push-ups" }));
    expect(screen.queryByLabelText("Push-ups set 1 reps")).not.toBeInTheDocument();
  });

  it("blocks submission and shows errors for invalid input", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    expect(screen.getByText("Give your workout a title.")).toBeInTheDocument();
    expect(screen.getByText("Add at least one exercise to your workout.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid workout payload", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Workout title"), "Monday Upper Body");
    await addExercise(user, "Bench press");
    await user.type(screen.getByLabelText("Bench press set 1 reps"), "8");
    await user.type(screen.getByLabelText("Bench press set 1 weight in kilograms"), "40");
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: "Monday Upper Body",
      date: "2026-11-20",
      notes: "",
      duration_minutes: null,
      entries: [{ exercise_id: 1, notes: "", sets: [{ reps: 8, weight_kg: "40" }] }],
    });
  });

  it("prevents duplicate submissions while saving", async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Workout title"), "Run");
    await addExercise(user, "Running");
    await user.type(screen.getByLabelText("Distance (km)"), "5");
    const save = screen.getByRole("button", { name: "Save workout" });
    await user.click(save);
    expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Saving/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
  });

  it("keeps entered data and shows the error when the API fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(0, "We couldn't reach the server."));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Workout title"), "Plank session");
    await addExercise(user, "Plank");
    await user.type(screen.getByLabelText("Duration (minutes)"), "3");
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach the server.");
    expect(screen.getByLabelText("Workout title")).toHaveValue("Plank session");
    expect(screen.getByLabelText("Duration (minutes)")).toHaveValue("3");
    expect(screen.getByRole("button", { name: "Save workout" })).toBeEnabled();
  });

  it("maps server validation errors onto fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, "Invalid", { "entries.0.sets.0.reps": ["Ensure this value is less than or equal to 1000."] }),
    );
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Workout title"), "Push day");
    await addExercise(user, "Push-ups");
    await user.type(screen.getByLabelText("Push-ups set 1 reps"), "20");
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    expect(await screen.findByText("Ensure this value is less than or equal to 1000.")).toBeInTheDocument();
    expect(screen.getByLabelText("Push-ups set 1 reps")).toHaveAttribute("aria-invalid", "true");
  });
});
