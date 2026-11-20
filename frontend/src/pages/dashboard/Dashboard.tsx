import { CalendarDays, Clock, Dumbbell, Flame, Plus, Sparkles, Target, Trophy } from "lucide-react";
import { Link } from "react-router";
import { analyticsApi } from "../../api";
import { DailyActivityChart } from "../../components/charts/Charts";
import { ButtonLink } from "../../components/ui/Button";
import { Card, CardHeader, PageHeader, ProgressBar, StatCard } from "../../components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { RecentWorkoutRow } from "../../components/workouts/WorkoutCard";
import { displayNameOf, useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../hooks/useApi";
import { formatMinutes, formatRange, greeting, pluralize } from "../../utils/format";

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[var(--radius-card)]" />
    </div>
  );
}

function goalMessage(completed: number, target: number) {
  if (completed >= target) return "Goal reached — wonderful consistency!";
  const left = target - completed;
  if (completed === 0) return `Your week starts here: ${pluralize(left, "workout")} to reach your goal.`;
  return `${pluralize(left, "more workout")} to reach your goal.`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi((signal) => analyticsApi.dashboard(signal), []);
  const name = displayNameOf(user);

  const header = (
    <PageHeader
      eyebrow={`${greeting()}, ${name}`}
      title={data && data.total_workouts > 0 ? "Welcome back!" : "Ready to make today count?"}
      description={data && data.total_workouts > 0 ? "Here's how your training is going." : undefined}
      actions={
        <ButtonLink to="/workouts/new" className="hidden sm:inline-flex" icon={<Plus aria-hidden className="size-4" />}>
          Log Workout
        </ButtonLink>
      }
    />
  );

  if (loading && !data) return <>{header}<DashboardSkeleton /></>;
  if (error || !data) return <>{header}<ErrorState message={error?.message ?? "Unknown error"} onRetry={reload} /></>;

  if (data.total_workouts === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="Your journal is ready"
            description="Log your first workout — a walk, a stretch session or a full gym day all count. Your stats and charts will appear here."
            action={
              <ButtonLink to="/workouts/new" size="lg" icon={<Plus aria-hidden className="size-4" />}>
                Log your first workout
              </ButtonLink>
            }
          />
        </Card>
        <p className="mt-4 text-center text-sm text-ink-muted">
          Want ideas? Browse the{" "}
          <Link to="/exercises" className="font-medium text-berry underline-offset-4 hover:underline">
            exercise library
          </Link>
          .
        </p>
      </>
    );
  }

  const { goal } = data;
  const lastSevenHasActivity = data.last_7_days.days.some((d) => d.workouts > 0);

  return (
    <>
      {header}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          accent
          label="This week"
          value={data.workouts_this_week}
          hint={formatRange(data.week.start, data.week.end)}
          icon={<CalendarDays className="size-4" />}
        />
        <StatCard label="Total workouts" value={data.total_workouts} hint="All time" icon={<Trophy className="size-4" />} />
        <StatCard
          label="Time trained"
          value={formatMinutes(data.total_duration_minutes)}
          hint={
            data.workouts_with_duration === data.total_workouts
              ? "Across all workouts"
              : `From ${pluralize(data.workouts_with_duration, "workout")} with a duration`
          }
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Exercises logged"
          value={data.total_logged_exercises}
          hint="Across all workouts"
          icon={<Dumbbell className="size-4" />}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Weekly activity"
            description={`Workouts per day · ${formatRange(data.last_7_days.period.start, data.last_7_days.period.end)}`}
          />
          <div className="px-3 pt-4 pb-4 sm:px-5">
            <DailyActivityChart days={data.last_7_days.days} today={data.today} />
            {!lastSevenHasActivity && (
              <p className="mt-2 text-center text-sm text-ink-muted">No workouts in the last 7 days — today is a great day to start again.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Weekly goal"
            description="Monday to Sunday"
            action={
              <Link to="/profile" className="text-sm font-medium text-berry underline-offset-4 hover:underline">
                Change
              </Link>
            }
          />
          <div className="flex flex-1 flex-col justify-between gap-6 px-5 pt-5 pb-6 sm:px-6">
            <div>
              <p className="tabular text-4xl font-semibold tracking-tight">
                {goal.completed}
                <span className="ml-1.5 text-lg font-medium text-ink-muted">of {pluralize(goal.weekly_target, "workout")}</span>
              </p>
              <div className="mt-4">
                <ProgressBar value={goal.completed} max={goal.weekly_target} label="Weekly goal progress" />
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                <Target aria-hidden className="size-4 text-berry" />
                {goalMessage(goal.completed, goal.weekly_target)}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-ivory p-3.5">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-white text-berry ring-1 ring-stone">
                <Flame className="size-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {goal.streak_weeks > 0 ? `${pluralize(goal.streak_weeks, "week")} in a row` : "No streak yet"}
                </p>
                <p className="text-sm text-ink-muted">Consecutive weeks meeting your goal</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent workouts"
          action={
            <Link to="/workouts" className="text-sm font-medium text-berry underline-offset-4 hover:underline">
              View all
            </Link>
          }
        />
        <ul className="px-2 pt-2 pb-3 sm:px-3">
          {data.recent_workouts.map((w) => (
            <li key={w.id}>
              <RecentWorkoutRow workout={w} today={data.today} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
