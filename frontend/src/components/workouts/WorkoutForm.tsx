import { ChevronDown, ChevronUp, Plus, Save, Trash2, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { ApiError, exercisesApi, localToday } from "../../api";
import { useApi } from "../../hooks/useApi";
import type { WorkoutInput } from "../../types";
import {
  LIMITS,
  newEntry,
  newSet,
  serverErrorsToForm,
  toPayload,
  usesSets,
  validateDraft,
  type EntryDraft,
  type FormErrors,
  type WorkoutDraft,
} from "../../utils/workoutForm";
import { Button, IconButton } from "../ui/Button";
import { Card, CategoryBadge } from "../ui/Card";
import { FieldError, FormAlert, TextAreaField, TextField, controlClasses } from "../ui/Field";
import { ErrorState, Spinner } from "../ui/Feedback";
import { ExercisePicker, MEASUREMENT_HINT } from "./ExercisePicker";

interface WorkoutFormProps {
  initial: WorkoutDraft;
  submitLabel: string;
  onSubmit: (payload: WorkoutInput) => Promise<void>;
  onCancel: () => void;
}

function SmallInput({
  label,
  error,
  value,
  onChange,
  inputMode,
  suffix,
  placeholder,
}: {
  label: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  inputMode: "numeric" | "decimal";
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <input
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          title={error}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${controlClasses} tabular h-11 ${suffix ? "pr-10" : ""} ${error ? "border-danger" : "border-stone-deep focus:border-berry"}`}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">{suffix}</span>}
      </span>
    </label>
  );
}

function EntryEditor({
  entry,
  index,
  count,
  errors,
  onChange,
  onRemove,
  onMove,
}: {
  entry: EntryDraft;
  index: number;
  count: number;
  errors: FormErrors;
  onChange: (e: EntryDraft) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const p = `entries.${index}`;
  const type = entry.exercise.measurement_type;
  const withWeight = type === "reps_weight";
  const entryError = errors[p] ?? errors[`${p}.sets`];

  const updateSet = (j: number, patch: Partial<{ reps: string; weight: string }>) =>
    onChange({ ...entry, sets: entry.sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-stone bg-ivory/60 px-4 py-3 sm:px-5">
        <span aria-hidden className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-berry ring-1 ring-stone">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{entry.exercise.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <CategoryBadge category={entry.exercise.category} label={entry.exercise.category_label} />
            {MEASUREMENT_HINT[type]}
          </p>
        </div>
        <div className="-my-1 -mr-2 flex">
          <IconButton label={`Move ${entry.exercise.name} up`} disabled={index === 0} onClick={() => onMove(-1)} className="hidden sm:inline-flex">
            <ChevronUp aria-hidden className="size-4" />
          </IconButton>
          <IconButton label={`Move ${entry.exercise.name} down`} disabled={index === count - 1} onClick={() => onMove(1)} className="hidden sm:inline-flex">
            <ChevronDown aria-hidden className="size-4" />
          </IconButton>
          <IconButton label={`Remove ${entry.exercise.name}`} tone="danger" onClick={onRemove}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {usesSets(type) && (
          <div>
            <div className="mb-2 grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs font-medium tracking-wide text-ink-muted uppercase sm:grid-cols-[4rem_1fr_auto]">
              <span>Set</span>
              <span className={withWeight ? "grid grid-cols-2 gap-2" : ""}>
                <span>Reps</span>
                {withWeight && <span>Weight (kg)</span>}
              </span>
              <span className="w-10" />
            </div>
            <ol className="space-y-2">
              {entry.sets.map((s, j) => {
                const sp = `${p}.sets.${j}`;
                const repsErr = errors[`${sp}.reps`];
                const weightErr = errors[`${sp}.weight_kg`];
                return (
                  <li key={s.key}>
                    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[4rem_1fr_auto]">
                      <span className="tabular text-sm font-medium text-ink-muted">Set {j + 1}</span>
                      <div className="flex gap-2">
                        <SmallInput
                          label={`${entry.exercise.name} set ${j + 1} reps`}
                          inputMode="numeric"
                          value={s.reps}
                          placeholder="0"
                          error={repsErr}
                          onChange={(v) => updateSet(j, { reps: v })}
                        />
                        {withWeight && (
                          <SmallInput
                            label={`${entry.exercise.name} set ${j + 1} weight in kilograms`}
                            inputMode="decimal"
                            value={s.weight}
                            placeholder="—"
                            suffix="kg"
                            error={weightErr}
                            onChange={(v) => updateSet(j, { weight: v })}
                          />
                        )}
                      </div>
                      <IconButton
                        label={`Remove set ${j + 1} of ${entry.exercise.name}`}
                        disabled={entry.sets.length === 1}
                        onClick={() => onChange({ ...entry, sets: entry.sets.filter((_, k) => k !== j) })}
                      >
                        <X aria-hidden className="size-4" />
                      </IconButton>
                    </div>
                    {(repsErr || weightErr) && (
                      <div className="pl-[4rem] sm:pl-[4.5rem]">
                        <FieldError message={repsErr ?? weightErr} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <Button
              variant="soft"
              size="sm"
              className="mt-3"
              icon={<Plus aria-hidden className="size-4" />}
              disabled={entry.sets.length >= LIMITS.setsMax}
              onClick={() => onChange({ ...entry, sets: [...entry.sets, newSet(entry.sets.at(-1))] })}
            >
              Add set
            </Button>
          </div>
        )}

        {type === "distance" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Distance (km)"
              inputMode="decimal"
              value={entry.distance}
              onChange={(e) => onChange({ ...entry, distance: e.target.value })}
              error={errors[`${p}.distance_km`]}
              placeholder="e.g. 5"
            />
            <TextField
              label="Duration (minutes)"
              optional
              inputMode="decimal"
              value={entry.duration}
              onChange={(e) => onChange({ ...entry, duration: e.target.value })}
              error={errors[`${p}.duration_minutes`]}
              placeholder="e.g. 30"
            />
          </div>
        )}

        {type === "duration" && (
          <TextField
            label="Duration (minutes)"
            inputMode="decimal"
            value={entry.duration}
            onChange={(e) => onChange({ ...entry, duration: e.target.value })}
            error={errors[`${p}.duration_minutes`]}
            placeholder="e.g. 10"
            wrapperClassName="sm:max-w-xs"
          />
        )}

        <TextField
          label="Exercise note"
          optional
          value={entry.notes}
          maxLength={LIMITS.entryNotesMax}
          onChange={(e) => onChange({ ...entry, notes: e.target.value })}
          error={errors[`${p}.notes`]}
          placeholder="How did it feel?"
        />
        <FieldError message={entryError} />
      </div>
    </Card>
  );
}

export function WorkoutForm({ initial, submitLabel, onSubmit, onCancel }: WorkoutFormProps) {
  const [draft, setDraft] = useState<WorkoutDraft>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(initial.entries.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // guards against double submission before re-render
  const formRef = useRef<HTMLFormElement>(null);
  const exercises = useApi((signal) => exercisesApi.list({}, signal), []);
  const today = localToday();

  const setField = <K extends keyof WorkoutDraft>(key: K, value: WorkoutDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setEntry = (i: number, e: EntryDraft) => setDraft((d) => ({ ...d, entries: d.entries.map((x, k) => (k === i ? e : x)) }));
  const removeEntry = (i: number) => setDraft((d) => ({ ...d, entries: d.entries.filter((_, k) => k !== i) }));
  const moveEntry = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const entries = [...d.entries];
      [entries[i], entries[i + dir]] = [entries[i + dir], entries[i]];
      return { ...d, entries };
    });

  const focusFirstError = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const clientErrors = validateDraft(draft, today);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) {
      setFormError("Please fix the highlighted fields before saving.");
      focusFirstError();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(toPayload(draft));
    } catch (err) {
      // Keep everything the user typed; show what went wrong.
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(serverErrorsToForm(err.fieldErrors));
        setFormError("Some details need another look. Nothing was saved yet.");
        focusFirstError();
      } else {
        setFormError(
          err instanceof ApiError ? `${err.message} Your workout hasn't been saved yet — your entries are still here.` : "Something went wrong. Please try again.",
        );
      }
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const selectedIds = new Set(draft.entries.map((e) => e.exercise.id));

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-6" aria-label="Workout form">
      <FormAlert message={formError} />

      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
          <TextField
            label="Workout title"
            name="title"
            value={draft.title}
            maxLength={LIMITS.titleMax}
            onChange={(e) => setField("title", e.target.value)}
            error={errors.title}
            placeholder="e.g. Monday Upper Body"
            required
          />
          <TextField
            label="Date"
            name="date"
            type="date"
            value={draft.date}
            max={today}
            onChange={(e) => setField("date", e.target.value)}
            error={errors.date}
            required
          />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-[12rem_1fr]">
          <TextField
            label="Duration (min)"
            name="duration"
            optional
            inputMode="numeric"
            value={draft.duration}
            onChange={(e) => setField("duration", e.target.value)}
            error={errors.duration}
            placeholder="e.g. 45"
          />
          <TextAreaField
            label="Session notes"
            name="notes"
            optional
            rows={2}
            maxLength={LIMITS.notesMax}
            value={draft.notes}
            onChange={(e) => setField("notes", e.target.value)}
            error={errors.notes}
            placeholder="Energy, mood, anything worth remembering"
            className="min-h-11"
          />
        </div>
      </Card>

      <section aria-labelledby="exercises-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="exercises-heading" className="text-lg font-semibold">
            Exercises <span className="text-ink-muted tabular font-normal">({draft.entries.length})</span>
          </h2>
        </div>

        {draft.entries.map((entry, i) => (
          <EntryEditor
            key={entry.key}
            entry={entry}
            index={i}
            count={draft.entries.length}
            errors={errors}
            onChange={(e) => setEntry(i, e)}
            onRemove={() => removeEntry(i)}
            onMove={(dir) => moveEntry(i, dir)}
          />
        ))}

        {pickerOpen ? (
          exercises.error ? (
            <ErrorState message={exercises.error.message} onRetry={exercises.reload} />
          ) : exercises.loading || !exercises.data ? (
            <Card className="flex justify-center p-8">
              <Spinner label="Loading exercises" />
            </Card>
          ) : (
            <ExercisePicker
              exercises={exercises.data}
              selectedIds={selectedIds}
              onClose={() => setPickerOpen(false)}
              onPick={(ex) => {
                setDraft((d) => ({ ...d, entries: [...d.entries, newEntry(ex)] }));
                setErrors((errs) => ({ ...errs, entries: "" }));
                setPickerOpen(false);
              }}
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={draft.entries.length >= LIMITS.entriesMax}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-blush bg-white/50 font-medium text-berry transition-colors hover:border-berry hover:bg-white disabled:opacity-50"
          >
            <Plus aria-hidden className="size-5" />
            Add exercise
          </button>
        )}
        <FieldError message={errors.entries} />
      </section>

      <div className="sticky bottom-20 z-20 -mx-4 flex gap-3 border-t border-stone bg-ivory/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 lg:bottom-0">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={submitting} icon={<Save aria-hidden className="size-4" />} className="flex-[2] sm:flex-none">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
