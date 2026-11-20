import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsApi, ApiError, authApi, workoutsApi } from "../api";
import Dashboard from "../pages/dashboard/Dashboard";
import WorkoutHistory from "../pages/workouts/WorkoutHistory";
import { dashboard, user, workoutSummary } from "../test/fixtures";
import { renderPage } from "../test/render";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    localToday: () => "2026-11-20",
    authApi: { me: vi.fn(), logout: vi.fn() },
    workoutsApi: { list: vi.fn(), remove: vi.fn() },
    analyticsApi: { dashboard: vi.fn() },
  };
});

beforeEach(() => {
  vi.mocked(authApi.me).mockResolvedValue(user);
});

describe("Dashboard", () => {
  it("displays statistics from the API", async () => {
    vi.mocked(analyticsApi.dashboard).mockResolvedValue(dashboard());
    renderPage(<Dashboard />);
    const summary = await screen.findByRole("region", { name: "Summary" });
    expect(within(summary).getByText("This week").parentElement?.parentElement).toHaveTextContent("2");
    expect(within(summary).getByText("12")).toBeInTheDocument(); // total workouts
    expect(within(summary).getByText("9 h")).toBeInTheDocument(); // 540 minutes
    expect(within(summary).getByText("31")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Weekly goal progress" })).toHaveAttribute("aria-valuetext", "2 of 4");
    expect(screen.getByText("3 weeks in a row")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Monday Upper Body/ })).toHaveAttribute("href", "/workouts/10");
    expect(screen.getByText(/Good (morning|afternoon|evening), Sam/)).toBeInTheDocument();
  });

  it("shows a welcoming empty state for new users", async () => {
    vi.mocked(analyticsApi.dashboard).mockResolvedValue(dashboard({ total_workouts: 0, recent_workouts: [] }));
    renderPage(<Dashboard />);
    expect(await screen.findByText("Your journal is ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Log your first workout/ })).toHaveAttribute("href", "/workouts/new");
  });

  it("shows an error with retry when loading fails", async () => {
    vi.mocked(analyticsApi.dashboard).mockRejectedValueOnce(new ApiError(500, "Something went wrong on our side."));
    vi.mocked(analyticsApi.dashboard).mockResolvedValueOnce(dashboard());
    renderPage(<Dashboard />);
    expect(await screen.findByText("Something went wrong on our side.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Summary" })).toBeInTheDocument();
  });
});

describe("WorkoutHistory", () => {
  const page = (results = [workoutSummary(), workoutSummary({ id: 11, title: "Evening run", date: "2026-11-12", exercise_count: 1, exercise_names: ["Running"], notes_preview: "" })]) => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  });

  it("renders workouts with their details", async () => {
    vi.mocked(workoutsApi.list).mockResolvedValue(page());
    renderPage(<WorkoutHistory />);
    expect(await screen.findByRole("link", { name: "Monday Upper Body" })).toHaveAttribute("href", "/workouts/10");
    expect(screen.getByText("Evening run")).toBeInTheDocument();
    expect(screen.getByText("2 workouts logged so far.")).toBeInTheDocument();
    expect(screen.getByText("“Felt strong”")).toBeInTheDocument();
    expect(screen.getAllByText("45 min")).toHaveLength(2);
  });

  it("shows an empty state when there are no workouts", async () => {
    vi.mocked(workoutsApi.list).mockResolvedValue(page([]));
    renderPage(<WorkoutHistory />);
    expect(await screen.findByText("No workouts yet")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and can be cancelled", async () => {
    vi.mocked(workoutsApi.list).mockResolvedValue(page());
    renderPage(<WorkoutHistory />);
    await userEvent.click(await screen.findByRole("button", { name: /Delete Monday Upper Body/ }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete this workout?" });
    expect(dialog).toHaveTextContent("Monday Upper Body");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(workoutsApi.remove).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and refreshes the list", async () => {
    vi.mocked(workoutsApi.list).mockResolvedValueOnce(page()).mockResolvedValueOnce(page([page().results[1]]));
    vi.mocked(workoutsApi.remove).mockResolvedValue(undefined);
    renderPage(<WorkoutHistory />);
    await userEvent.click(await screen.findByRole("button", { name: /Delete Monday Upper Body/ }));
    await userEvent.click(screen.getByRole("button", { name: "Delete workout" }));
    await waitFor(() => expect(workoutsApi.remove).toHaveBeenCalledWith(10));
    expect(await screen.findByText("“Monday Upper Body” was deleted.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("link", { name: "Monday Upper Body" })).not.toBeInTheDocument());
    expect(workoutsApi.list).toHaveBeenCalledTimes(2);
  });

  it("closes the dialog with Escape", async () => {
    vi.mocked(workoutsApi.list).mockResolvedValue(page());
    renderPage(<WorkoutHistory />);
    await userEvent.click(await screen.findByRole("button", { name: /Delete Evening run/ }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
