export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#752A45" />
      <path
        d="M8 17.5h3l2.5-6 4 10 2.5-6H24"
        fill="none"
        stroke="#FAF8F5"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[0.9375rem] font-semibold tracking-tight text-ink">Workout Logger</span>
          <span className="block text-xs text-ink-muted">Your progress, your pace</span>
        </span>
      )}
    </span>
  );
}
