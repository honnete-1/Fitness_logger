import { ChevronRight, Clock, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { WorkoutSummary } from "../../types";
import { formatDate, formatMinutes, formatRelativeDate, parseDate, pluralize } from "../../utils/format";
import { IconButton } from "../ui/Button";

function DateBadge({ date }: { date: string }) {
  const d = parseDate(date);
  return (
    <div aria-hidden className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-blush-soft text-berry">
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide">{d.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="tabular text-xl leading-none font-semibold">{d.getDate()}</span>
    </div>
  );
}

/** Compact row for dashboard "recent workouts". */
export function RecentWorkoutRow({ workout, today }: { workout: WorkoutSummary; today: string }) {
  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-ivory"
    >
      <DateBadge date={workout.date} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{workout.title}</p>
        <p className="mt-0.5 truncate text-sm text-ink-muted">
          {formatRelativeDate(workout.date, today)} · {pluralize(workout.exercise_count, "exercise")}
          {workout.duration_minutes ? ` · ${formatMinutes(workout.duration_minutes)}` : ""}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Full card for workout history, with actions. */
export function WorkoutHistoryCard({
  workout,
  today,
  onDelete,
}: {
  workout: WorkoutSummary;
  today: string;
  onDelete: (w: WorkoutSummary) => void;
}) {
  return (
    <article className="flex gap-4 rounded-[var(--radius-card)] border border-stone bg-white p-4 shadow-card transition-shadow hover:shadow-lift sm:p-5">
      <DateBadge date={workout.date} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base leading-snug font-semibold">
              <Link to={`/workouts/${workout.id}`} className="rounded hover:text-berry">
                {workout.title}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">{formatRelativeDate(workout.date, today)}</p>
          </div>
          <div className="-mt-1 -mr-1 flex shrink-0">
            <Link
              to={`/workouts/${workout.id}/edit`}
              aria-label={`Edit ${workout.title}, ${formatDate(workout.date)}`}
              title="Edit"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-stone/70 hover:text-ink"
            >
              <Pencil aria-hidden className="size-4" />
            </Link>
            <IconButton label={`Delete ${workout.title}, ${formatDate(workout.date)}`} tone="danger" onClick={() => onDelete(workout)}>
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell aria-hidden className="size-4 text-taupe" />
            {pluralize(workout.exercise_count, "exercise")}
          </span>
          {workout.duration_minutes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4 text-taupe" />
              {formatMinutes(workout.duration_minutes)}
            </span>
          )}
        </div>
        {workout.exercise_names.length > 0 && (
          <p className="mt-2 truncate text-sm text-ink">{workout.exercise_names.join(" · ")}</p>
        )}
        {workout.notes_preview && <p className="mt-2 line-clamp-2 text-sm text-ink-muted italic">“{workout.notes_preview}”</p>}
        <Link
          to={`/workouts/${workout.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-berry underline-offset-4 hover:underline"
        >
          View details <ChevronRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
