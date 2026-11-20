import { Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ApiError, exercisesApi, type ExerciseInput } from "../../api";
import { Button, IconButton } from "../../components/ui/Button";
import { Card, CategoryBadge, PageHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { FormAlert, SelectField, TextField } from "../../components/ui/Field";
import { CATEGORIES, CategoryChips, MEASUREMENT_HINT } from "../../components/workouts/ExercisePicker";
import { useToast } from "../../contexts/ToastContext";
import { useApi } from "../../hooks/useApi";
import type { Category, Exercise, MeasurementType } from "../../types";

const MEASUREMENTS: { value: MeasurementType; label: string }[] = [
  { value: "reps", label: "Sets × reps (bodyweight)" },
  { value: "reps_weight", label: "Sets × reps with weight (kg)" },
  { value: "duration", label: "Duration (minutes)" },
  { value: "distance", label: "Distance (km) + optional time" },
];

function NewExerciseForm({ onCreated, onCancel }: { onCreated: (e: Exercise) => void; onCancel: () => void }) {
  const [values, setValues] = useState<ExerciseInput>({ name: "", description: "", category: "strength", measurement_type: "reps_weight" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setErrors({ name: "Give the exercise a name." });
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      onCreated(await exercisesApi.create({ ...values, name: values.name.trim() }));
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v.join(" ")])));
      } else setFormError(err instanceof ApiError ? err.message : "Couldn't save the exercise.");
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6 animate-fade-up p-5 sm:p-6">
      <form noValidate onSubmit={submit} aria-label="New custom exercise">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">New custom exercise</h2>
          <IconButton label="Close" onClick={onCancel}>
            <X aria-hidden className="size-5" />
          </IconButton>
        </div>
        <FormAlert message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" value={values.name} maxLength={100} onChange={(e) => setValues({ ...values, name: e.target.value })} error={errors.name} placeholder="e.g. Kettlebell swing" />
          <TextField label="Description" optional value={values.description} maxLength={500} onChange={(e) => setValues({ ...values, description: e.target.value })} error={errors.description} />
          <SelectField label="Category" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value as Category })} error={errors.category}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </SelectField>
          <SelectField label="How is it measured?" value={values.measurement_type} onChange={(e) => setValues({ ...values, measurement_type: e.target.value as MeasurementType })} error={errors.measurement_type}>
            {MEASUREMENTS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </SelectField>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Add exercise</Button>
        </div>
      </form>
    </Card>
  );
}

export default function ExerciseLibrary() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi((signal) => exercisesApi.list({}, signal), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)));
  }, [data, query, category]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await exercisesApi.remove(toDelete.id);
      setData((list) => (list ?? []).filter((e) => e.id !== toDelete.id));
      toast.success(`${toDelete.name} was removed from your library.`);
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the exercise.");
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Exercise library"
        description="Built-in exercises plus any you add yourself. Each one knows how it should be measured."
        actions={
          !creating && (
            <Button variant="secondary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setCreating(true)}>
              Custom exercise
            </Button>
          )
        }
      />

      {creating && (
        <NewExerciseForm
          onCancel={() => setCreating(false)}
          onCreated={(ex) => {
            setData((list) => [...(list ?? []), ex].sort((a, b) => a.name.localeCompare(b.name)));
            setCreating(false);
            toast.success(`${ex.name} added to your library.`);
          }}
        />
      )}

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <label htmlFor="library-search" className="sr-only">Search exercises</label>
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="h-11 w-full rounded-[var(--radius-field)] border border-stone-deep bg-white pr-3 pl-10 text-[0.9375rem] placeholder:text-ink-subtle focus:border-berry focus:ring-2 focus:ring-berry/25 focus:outline-none"
          />
        </div>
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />)}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="size-6" />}
            title="No exercises found"
            description="Try another search or category, or add it as a custom exercise."
            action={<Button variant="secondary" onClick={() => { setQuery(""); setCategory(""); }}>Show all exercises</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <Card className="flex h-full gap-3 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{e.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                    <CategoryBadge category={e.category} label={e.category_label} />
                    <span>{MEASUREMENT_HINT[e.measurement_type]}</span>
                    {e.is_custom && <span className="rounded-full border border-stone-deep px-2 py-0.5 text-xs">Custom</span>}
                  </div>
                  {e.description && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{e.description}</p>}
                </div>
                {e.is_custom && (
                  <IconButton label={`Delete ${e.name}`} tone="danger" onClick={() => setToDelete(e)} className="-mt-1 -mr-1">
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete custom exercise?"
        description={<>“{toDelete?.name}” will be removed from your library. Exercises already used in a logged workout can't be deleted.</>}
        confirmLabel="Delete exercise"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
