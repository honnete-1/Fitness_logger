import { ArrowLeft, CalendarDays, Clock, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { workoutsApi } from "../../api";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Card, CategoryBadge, PageHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "../../components/ui/Feedback";
import { useApi } from "../../hooks/useApi";
import { useDeleteWorkout } from "../../hooks/useDeleteWorkout";
import type { WorkoutEntry } from "../../types";
import { formatDate, formatMinutes, pluralize, trimNumber } from "../../utils/format";

function EntrySummary({ entry }: { entry: WorkoutEntry }) {
  const type = entry.exercise.measurement_type;
  if (type === "reps" || type === "reps_weight") {
    const totalReps = entry.sets.reduce((sum, s) => sum + s.reps, 0);
    return (
      <div>
        <table className="w-full text-sm">
          <caption className="sr-only">Sets for {entry.exercise.name}</caption>
          <thead>
            <tr className="text-left text-xs tracking-wide text-ink-muted uppercase">
              <th scope="col" className="pb-2 font-medium">Set</th>
              <th scope="col" className="pb-2 font-medium">Reps</th>
              {type === "reps_weight" && <th scope="col" className="pb-2 font-medium">Weight</th>}
            </tr>
          </thead>
          <tbody className="tabular">
            {entry.sets.map((s) => (
              <tr key={s.id} className="border-t border-stone">
                <td className="py-2 text-ink-muted">{s.set_number}</td>
                <td className="py-2 font-medium">{s.reps}</td>
                {type === "reps_weight" && <td className="py-2">{s.weight_kg != null ? `${trimNumber(s.weight_kg)} kg` : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-ink-muted">
          {pluralize(entry.sets.length, "set")} · {pluralize(totalReps, "rep")} total
        </p>
      </div>
    );
  }
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      {type === "distance" && (
        <div>
          <dt className="text-ink-muted">Distance</dt>
          <dd className="tabular text-lg font-semibold">{trimNumber(entry.distance_km ?? 0)} km</dd>
        </div>
      )}
      {entry.duration_minutes != null && (
        <div>
          <dt className="text-ink-muted">Duration</dt>
          <dd className="tabular text-lg font-semibold">{formatMinutes(entry.duration_minutes)}</dd>
        </div>
      )}
    </dl>
  );
}

export default function WorkoutDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi((signal) => workoutsApi.get(id, signal), [id]);
  const del = useDeleteWorkout(useCallback(() => navigate("/workouts", { replace: true }), [navigate]));

  const back = (
    <Link to="/workouts" className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink">
      <ArrowLeft aria-hidden className="size-4" /> Workout history
    </Link>
  );

  if (loading && !data) return <>{back}<LoadingState label="Loading workout" /></>;
  if (error || !data)
    return (
      <>
        {back}
        <ErrorState message={error?.message ?? "Workout not found."} onRetry={error?.status === 404 ? undefined : reload} />
      </>
    );

  return (
    <>
      {back}
      <PageHeader
        title={data.title}
        actions={
          <>
            <ButtonLink to={`/workouts/${data.id}/edit`} variant="secondary" icon={<Pencil aria-hidden className="size-4" />}>
              Edit
            </ButtonLink>
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => del.request(data)}>
              Delete
            </Button>
          </>
        }
      />

      <Card className="mb-6 p-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarDays, label: "Date", value: formatDate(data.date) },
            { icon: Dumbbell, label: "Exercises", value: String(data.entries.length) },
            { icon: Clock, label: "Session duration", value: data.duration_minutes ? formatMinutes(data.duration_minutes) : "Not recorded" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-blush-soft text-berry">
                <Icon className="size-4" />
              </span>
              <div>
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {data.notes && (
          <div className="mt-5 rounded-2xl bg-ivory p-4">
            <h2 className="text-sm font-medium text-ink-muted">Notes</h2>
            <p className="mt-1 leading-relaxed whitespace-pre-line">{data.notes}</p>
          </div>
        )}
      </Card>

      <h2 className="mb-4 text-lg font-semibold">Exercises</h2>
      <ol className="grid gap-4 md:grid-cols-2">
        {data.entries.map((entry, i) => (
          <li key={entry.id}>
            <Card className="h-full p-5">
              <div className="mb-4 flex items-start gap-3">
                <span aria-hidden className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-berry-soft text-sm font-semibold text-berry">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{entry.exercise.name}</h3>
                  <div className="mt-1">
                    <CategoryBadge category={entry.exercise.category} label={entry.exercise.category_label} />
                  </div>
                </div>
              </div>
              <EntrySummary entry={entry} />
              {entry.notes && <p className="mt-3 border-t border-stone pt-3 text-sm text-ink-muted italic">“{entry.notes}”</p>}
            </Card>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={del.target !== null}
        title="Delete this workout?"
        description={
          <>
            <strong className="font-medium text-ink">“{data.title}”</strong> and its {pluralize(data.entries.length, "exercise")} will be
            permanently removed. This can't be undone.
          </>
        }
        confirmLabel="Delete workout"
        loading={del.deleting}
        onConfirm={del.confirm}
        onCancel={del.cancel}
      />
    </>
  );
}
