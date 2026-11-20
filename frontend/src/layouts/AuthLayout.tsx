import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../components/ui/Logo";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5 sm:px-8">
        <Link to="/" className="inline-flex rounded-xl" aria-label="Workout Logger home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-md animate-fade-up">
          <div className="rounded-[1.75rem] border border-stone bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}
