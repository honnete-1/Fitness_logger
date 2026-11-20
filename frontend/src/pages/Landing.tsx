import { ArrowRight, CalendarCheck, LineChart, NotebookPen, Target } from "lucide-react";
import { Link } from "react-router";
import { ButtonLink } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

const BENEFITS = [
  {
    icon: NotebookPen,
    title: "Log in seconds",
    body: "Sets, reps, weight, time or distance — the form adapts to each exercise.",
  },
  {
    icon: CalendarCheck,
    title: "See your history",
    body: "Every session in one calm, searchable journal you can edit at any time.",
  },
  {
    icon: LineChart,
    title: "Watch progress build",
    body: "Weekly activity and consistency charts drawn from your real workouts.",
  },
  {
    icon: Target,
    title: "Set your own pace",
    body: "Choose a weekly goal that fits your life — no leaderboards, no comparisons.",
  },
];

/** Decorative preview of the weekly chart (static illustration, not user data). */
function PreviewCard() {
  const bars = [1, 0, 1, 0, 0, 1, 0];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blush-soft" />
      <div className="absolute -top-3 -right-3 -z-10 size-24 rounded-full bg-blush/70" />
      <div className="rounded-[1.75rem] border border-stone bg-white p-6 shadow-lift">
        <p className="text-sm font-medium text-ink-muted">This week</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          3 <span className="text-base font-medium text-ink-muted">of 4 workouts</span>
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blush-soft">
          <div className="h-full w-3/4 rounded-full bg-berry" />
        </div>
        <div className="mt-6 flex h-28 items-end justify-between gap-2">
          {bars.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-lg ${v ? "bg-berry" : "bg-stone"}`}
                style={{ height: `${v ? v * 40 + 16 : 8}px` }}
              />
              <span className="text-xs text-ink-muted">{days[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-ivory p-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-white text-berry ring-1 ring-stone">
            <NotebookPen className="size-4" />
          </span>
          <div className="text-sm">
            <p className="font-medium">Monday Upper Body</p>
            <p className="text-ink-muted">Push-ups · Dumbbell curl · 45 min</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link to="/login" className="rounded-full px-4 py-2 text-[0.9375rem] font-medium text-ink hover:bg-stone/60">
            Log in
          </Link>
          <ButtonLink to="/register" size="sm" className="hidden sm:inline-flex">
            Create account
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-blush bg-white px-3 py-1 text-sm font-medium text-berry">
              <span className="size-1.5 rounded-full bg-berry" />
              Your progress, your pace
            </p>
            <h1 className="mt-6 text-[2.75rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              Every workout
              <br />
              <span className="text-berry">counts.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              Track your workouts, celebrate your progress, and build a routine that works for you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/register" size="lg" icon={null}>
                Start your journal
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              <ButtonLink to="/login" size="lg" variant="secondary">
                I already have an account
              </ButtonLink>
            </div>
          </div>
          <PreviewCard />
        </section>

        <section aria-labelledby="benefits" className="border-t border-stone bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <h2 id="benefits" className="max-w-md text-2xl font-semibold tracking-tight">
              A simple fitness journal, thoughtfully made.
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-[var(--radius-card)] border border-stone bg-white p-5 shadow-card">
                  <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-blush-soft text-berry">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-muted sm:px-8">
          Fitness Workout Logger · Built for consistency, not comparison.
        </p>
      </footer>
    </div>
  );
}
