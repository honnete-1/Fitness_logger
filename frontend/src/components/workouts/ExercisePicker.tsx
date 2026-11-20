import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Exercise } from "../../types";
import { IconButton } from "../ui/Button";
import { CategoryBadge } from "../ui/Card";
import { EmptyState } from "../ui/Feedback";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "mobility", label: "Mobility" },
];

export const MEASUREMENT_HINT: Record<Exercise["measurement_type"], string> = {
  reps: "Sets × reps",
  reps_weight: "Sets × reps · kg",
  duration: "Minutes",
  distance: "Km · minutes",
};

export function CategoryChips({ value, onChange }: { value: Category | ""; onChange: (c: Category | "") => void }) {
  return (
    <div role="group" aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {[{ value: "" as const, label: "All" }, ...CATEGORIES].map((c) => (
        <button
          key={c.value || "all"}
          type="button"
          aria-pressed={value === c.value}
          onClick={() => onChange(c.value)}
          className={`h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors ${
            value === c.value ? "border-berry bg-berry text-white" : "border-stone-deep bg-white text-ink-muted hover:border-taupe hover:text-ink"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function ExercisePicker({
  exercises,
  onPick,
  onClose,
  selectedIds,
}: {
  exercises: Exercise[];
  onPick: (e: Exercise) => void;
  onClose: () => void;
  selectedIds: Set<number>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => searchRef.current?.focus(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)),
    );
  }, [exercises, query, category]);

  return (
    <section
      aria-label="Choose an exercise"
      className="animate-fade-up rounded-[var(--radius-card)] border border-blush bg-white shadow-lift"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-stone px-4 py-3 sm:px-5">
        <h3 className="font-semibold">Add an exercise</h3>
        <IconButton label="Close exercise picker" onClick={onClose}>
          <X aria-hidden className="size-5" />
        </IconButton>
      </div>
      <div className="space-y-3 px-4 pt-4 sm:px-5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <label htmlFor="exercise-search" className="sr-only">
            Search exercises
          </label>
          <input
            id="exercise-search"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="h-11 w-full rounded-[var(--radius-field)] border border-stone-deep bg-ivory pr-3 pl-10 text-[0.9375rem] placeholder:text-ink-subtle focus:border-berry focus:bg-white focus:ring-2 focus:ring-berry/25 focus:outline-none"
          />
        </div>
        <CategoryChips value={category} onChange={setCategory} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Search className="size-5" />}
          title="No exercises found"
          description="Try a different search or category — or add your own from the Exercise Library."
        />
      ) : (
        <ul className="mt-2 max-h-80 overflow-y-auto px-2 pb-2 sm:px-3">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-ivory"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <span className="truncate">{e.name}</span>
                    {selectedIds.has(e.id) && <span className="shrink-0 text-xs font-normal text-ink-muted">· added</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                    <CategoryBadge category={e.category} label={e.category_label} />
                    <span>{MEASUREMENT_HINT[e.measurement_type]}</span>
                  </p>
                </div>
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-berry-soft text-berry transition-colors group-hover:bg-berry group-hover:text-white"
                >
                  <Plus className="size-4" />
                </span>
                <span className="sr-only">Add {e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
