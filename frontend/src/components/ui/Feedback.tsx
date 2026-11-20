import { CloudOff, Loader2, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Card } from "./Card";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 aria-hidden className="size-4 animate-spin text-berry" />
      <span>{label}…</span>
    </span>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-stone/70 ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "px-4 py-8" : "px-6 py-12 sm:py-16"}`}>
      <div aria-hidden className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-blush-soft" />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-white text-berry shadow-card ring-1 ring-stone">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
        <CloudOff aria-hidden className="mb-3 size-8 text-taupe" />
        <h3 className="font-semibold text-ink">We couldn't load this</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-5" icon={<RotateCw aria-hidden className="size-4" />} onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </Card>
  );
}
