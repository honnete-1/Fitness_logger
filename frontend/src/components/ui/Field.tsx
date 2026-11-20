import { AlertCircle } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const controlClasses =
  "block w-full rounded-[var(--radius-field)] border bg-white px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-berry/25 disabled:bg-ivory disabled:text-ink-muted";

function borderFor(error?: string | null) {
  return error ? "border-danger focus:border-danger" : "border-stone-deep hover:border-taupe focus:border-berry";
}

export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

interface WrapperProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  labelHidden?: boolean;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
}

function FieldWrapper({ label, hint, error, optional, className = "", labelHidden, children }: WrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelHidden ? "sr-only" : "mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink"}>
        <span>{label}</span>
        {optional && !labelHidden && <span className="text-xs font-normal text-ink-muted">Optional</span>}
      </label>
      {children({ id, describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; optional?: boolean; wrapperClassName?: string; labelHidden?: boolean };

export function TextField({ label, hint, error, optional, wrapperClassName, labelHidden, className = "", ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional} className={wrapperClassName} labelHidden={labelHidden}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClasses} ${borderFor(error)} h-11 ${className}`}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export function SelectField({ label, hint, error, optional, wrapperClassName, labelHidden, className = "", children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional} className={wrapperClassName} labelHidden={labelHidden}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClasses} ${borderFor(error)} h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%236B5D62'%20stroke-width='2'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")] bg-[length:1.1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10 ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

export function TextAreaField({ label, hint, error, optional, wrapperClassName, labelHidden, className = "", ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} optional={optional} className={wrapperClassName} labelHidden={labelHidden}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClasses} ${borderFor(error)} min-h-24 py-2.5 leading-relaxed ${className}`}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
