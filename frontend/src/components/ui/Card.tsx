import type { HTMLAttributes, ReactNode } from "react";
import type { Category } from "../../types";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-stone bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-medium text-berry">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-[0.9375rem] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  // Not built on <Card>: its bg-white would compete with the accent background.
  return (
    <div
      className={`rounded-[var(--radius-card)] border p-4 shadow-card sm:p-5 ${accent ? "border-transparent bg-berry text-white" : "border-stone bg-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${accent ? "text-white/80" : "text-ink-muted"}`}>{label}</p>
        {icon && (
          <span
            aria-hidden
            className={`flex size-8 items-center justify-center rounded-full ${accent ? "bg-white/15 text-white" : "bg-blush-soft text-berry"}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`tabular mt-2 text-[1.75rem] leading-none font-semibold tracking-tight sm:text-[2rem] ${accent ? "text-white" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className={`mt-2 text-sm ${accent ? "text-white/80" : "text-ink-muted"}`}>{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={`${value} of ${max}`}
      className="h-2.5 w-full overflow-hidden rounded-full bg-blush-soft"
    >
      <div className="h-full rounded-full bg-berry transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

const categoryStyles: Record<Category, string> = {
  strength: "bg-berry-soft text-berry",
  bodyweight: "bg-blush-soft text-[#7a3d4f]",
  cardio: "bg-[#f3ece4] text-[#6e4b2e]",
  flexibility: "bg-[#eef0ea] text-[#4a5a3f]",
  mobility: "bg-[#ecedf2] text-[#47506b]",
};

export function CategoryBadge({ category, label }: { category: Category; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles[category]}`}>
      {label}
    </span>
  );
}
