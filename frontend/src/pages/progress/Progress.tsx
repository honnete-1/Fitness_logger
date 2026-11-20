import { Activity, CalendarRange, LineChart, Plus, Repeat, Trophy } from "lucide-react";
import { useState } from "react";
import { analyticsApi } from "../../api";
import { ConsistencyChart, DailyActivityChart } from "../../components/charts/Charts";
import { ButtonLink } from "../../components/ui/Button";
import { Card, CardHeader, CategoryBadge, PageHeader, StatCard } from "../../components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { useApi } from "../../hooks/useApi";
import { formatRange, pluralize } from "../../utils/format";

const RANGES = [4, 8, 12] as const;

export default function Progress() {
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(8);
  const weekly = useApi((signal) => analyticsApi.weekly(signal), []);
  const trends = useApi((signal) => analyticsApi.trends(weeks, signal), [weeks]);

  const header = <PageHeader title="Progress" description="Consistency over intensity. Here's how your routine is shaping up." />;

  if ((weekly.loading && !weekly.data) || (trends.loading && !trends.data))
    return (
      <>
        {header}
        <div aria-busy="true" aria-label="Loading progress" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />)}</div>
          <Skeleton className="h-72 rounded-[var(--radius-card)]" />
        </div>
      </>
    );

  const error = weekly.error ?? trends.error;
  if (error || !weekly.data || !trends.data)
    return (
      <>
        {header}
        <ErrorState message={error?.message ?? "Unknown error"} onRetry={() => { weekly.reload(); trends.reload(); }} />
      </>
    );

  const w = weekly.data;
  const t = trends.data;

  if (t.all_time.total_workouts === 0)
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<LineChart className="size-6" />}
            title="No progress data yet"
            description="Once you log workouts, you'll see weekly activity, consistency trends and your most-used exercises here."
            action={<ButtonLink to="/workouts/new" icon={<Plus aria-hidden className="size-4" />}>Log a workout</ButtonLink>}
          />
        </Card>
      </>
    );

  const maxCategory = Math.max(1, ...t.categories.map((c) => c.logged_exercises));

  return (
    <>
      {header}
      <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard accent label="This week" value={w.total_workouts} hint={`${pluralize(w.active_days, "active day")}`} icon={<CalendarRange className="size-4" />} />
        <StatCard label="Total workouts" value={t.all_time.total_workouts} hint="All time" icon={<Trophy className="size-4" />} />
        <StatCard label="Weekly average" value={t.average_per_week} hint={`Last ${weeks} weeks`} icon={<Repeat className="size-4" />} />
        <StatCard label="Exercises logged" value={t.all_time.total_logged_exercises} hint="One per exercise in a workout" icon={<Activity className="size-4" />} />
      </section>

      <Card className="mt-6">
        <CardHeader title="This week" description={`Workouts per day · ${formatRange(w.period.start, w.period.end)} (Mon–Sun)`} />
        <div className="px-3 pt-4 pb-4 sm:px-5">
          <DailyActivityChart days={w.days} today={w.today} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Workout consistency"
          description={`Workouts per week · ${formatRange(t.period.start, t.period.end)} · ${pluralize(t.active_weeks, "active week")}`}
          action={
            <div role="group" aria-label="Time range" className="flex rounded-full border border-stone-deep bg-ivory p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={weeks === r}
                  onClick={() => setWeeks(r)}
                  className={`h-8 rounded-full px-3 text-sm font-medium transition-colors ${weeks === r ? "bg-white text-berry shadow-sm" : "text-ink-muted hover:text-ink"}`}
                >
                  {r}w
                </button>
              ))}
            </div>
          }
        />
        <div className={`px-3 pt-4 pb-2 sm:px-5 ${trends.loading ? "opacity-60" : ""}`}>
          <ConsistencyChart weeks={t.weeks} target={t.weekly_target} />
        </div>
        <p className="flex items-center gap-2 px-5 pb-5 text-sm text-ink-muted sm:px-6">
          <span aria-hidden className="inline-block h-0 w-5 border-t-2 border-dashed border-taupe" />
          Your weekly goal of {pluralize(t.weekly_target, "workout")} · darker bars met the goal
        </p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By category" description={`Logged exercises, last ${weeks} weeks`} />
          {t.categories.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-muted">No exercises logged in this period.</p>
          ) : (
            <ul className="space-y-4 px-5 pt-5 pb-6 sm:px-6">
              {t.categories.map((c) => (
                <li key={c.category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <CategoryBadge category={c.category} label={c.label} />
                    <span className="tabular font-medium">{c.logged_exercises}</span>
                  </div>
                  <div aria-hidden className="h-2 rounded-full bg-blush-soft">
                    <div className="h-full rounded-full bg-taupe" style={{ width: `${(c.logged_exercises / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Most frequent exercises" description={`Last ${weeks} weeks`} />
          {t.top_exercises.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-muted">No exercises logged in this period.</p>
          ) : (
            <ol className="px-3 pt-3 pb-4 sm:px-4">
              {t.top_exercises.map((ex, i) => (
                <li key={ex.exercise_id} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                  <span aria-hidden className="tabular flex size-7 items-center justify-center rounded-full bg-berry-soft text-sm font-semibold text-berry">{i + 1}</span>
                  <span className="flex-1 font-medium">{ex.name}</span>
                  <span className="tabular text-sm text-ink-muted">{pluralize(ex.times, "time")}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
