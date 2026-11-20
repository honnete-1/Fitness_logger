import { CalendarSearch, ClipboardList, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { localToday, workoutsApi, type WorkoutFilters } from "../../api";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Card, PageHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { SelectField, TextField } from "../../components/ui/Field";
import { CATEGORIES } from "../../components/workouts/ExercisePicker";
import { WorkoutHistoryCard } from "../../components/workouts/WorkoutCard";
import { useApi } from "../../hooks/useApi";
import { useDeleteWorkout } from "../../hooks/useDeleteWorkout";
import type { Category, WorkoutSummary } from "../../types";
import { pluralize } from "../../utils/format";

const FILTER_KEYS = ["search", "date_from", "date_to", "category"] as const;

export default function WorkoutHistory() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filters: WorkoutFilters = {
    page,
    search: params.get("search") ?? "",
    date_from: params.get("date_from") ?? "",
    date_to: params.get("date_to") ?? "",
    category: (params.get("category") ?? "") as Category | "",
  };
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const today = localToday();

  const { data, error, loading, reload } = useApi((signal) => workoutsApi.list(filters, signal), [params.toString()]);

  // Debounce the title search into the URL so results are shareable/bookmarkable.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((params.get("search") ?? "") !== searchInput.trim()) updateParam("search", searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  function updateParam(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  const clearFilters = () => {
    setSearchInput("");
    setParams({}, { replace: true });
  };

  const onDeleted = useCallback(() => {
    // If the last item on a page was removed, step back a page.
    if (data && data.results.length === 1 && page > 1) updateParam("page", String(page - 1));
    else reload();
  }, [data, page, reload]);
  const del = useDeleteWorkout<WorkoutSummary>(onDeleted);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 10)) : 1;

  return (
    <>
      <PageHeader
        title="Workout history"
        description={data ? `${pluralize(data.count, "workout")}${hasFilters ? " match your filters" : " logged so far"}.` : "Every session you've logged."}
        actions={
          <ButtonLink to="/workouts/new" className="hidden sm:inline-flex" icon={<Plus aria-hidden className="size-4" />}>
            Log Workout
          </ButtonLink>
        }
      />

      <Card className="mb-6 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="relative col-span-2 sm:col-span-1">
            <TextField
              label="Search by title"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. Upper body"
              className="pl-10"
            />
            <Search aria-hidden className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-ink-muted" />
          </div>
          <SelectField label="Category" wrapperClassName="col-span-2 sm:col-span-1" value={filters.category} onChange={(e) => updateParam("category", e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SelectField>
          <TextField label="From" type="date" max={today} value={filters.date_from} onChange={(e) => updateParam("date_from", e.target.value)} />
          <TextField label="To" type="date" max={today} value={filters.date_to} onChange={(e) => updateParam("date_to", e.target.value)} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="mt-3 -ml-2" icon={<X aria-hidden className="size-4" />} onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Card>

      {loading && !data ? (
        <div aria-busy="true" aria-label="Loading workouts" className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : data && data.results.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState
              icon={<CalendarSearch className="size-6" />}
              title="No workouts match"
              description="Try a different title, category or date range."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="No workouts yet"
              description="Your history will build up here as you log sessions. Start with something small today."
              action={
                <ButtonLink to="/workouts/new" icon={<Plus aria-hidden className="size-4" />}>
                  Log your first workout
                </ButtonLink>
              }
            />
          )}
        </Card>
      ) : data ? (
        <>
          <ul className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data.results.map((w) => (
              <li key={w.id}>
                <WorkoutHistoryCard workout={w} today={today} onDelete={del.request} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={!data.previous} onClick={() => updateParam("page", String(page - 1))}>
                Newer
              </Button>
              <p className="tabular text-sm text-ink-muted">
                Page {page} of {totalPages}
              </p>
              <Button variant="secondary" disabled={!data.next} onClick={() => updateParam("page", String(page + 1))}>
                Older
              </Button>
            </nav>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={del.target !== null}
        title="Delete this workout?"
        description={
          <>
            <strong className="font-medium text-ink">“{del.target?.title}”</strong> and all of its exercises and sets will be permanently
            removed. Your statistics will update. This can't be undone.
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
