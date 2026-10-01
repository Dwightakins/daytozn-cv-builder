import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { LiftCard } from "./ui/lift-card";

export const controlClass =
  "w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/60 hover:border-line-strong focus:border-foreground focus:ring-4 focus:ring-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/10 dark:aria-invalid:border-red-400";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm0 6h1.5V12h-1.5v-1.5Z" />
      </svg>
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-muted">(optional)</span> : null}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; optional?: boolean; error?: string };

export function TextField({ label, optional, error, className, ...props }: InputProps) {
  const id = useId();
  return (
    <Field id={id} label={label} optional={optional} error={error}>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(controlClass, className)}
      />
    </Field>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; optional?: boolean; error?: string };

export function TextArea({ label, optional, error, className, ...props }: AreaProps) {
  const id = useId();
  return (
    <Field id={id} label={label} optional={optional} error={error}>
      <textarea
        id={id}
        rows={4}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(controlClass, "resize-y leading-relaxed", className)}
      />
    </Field>
  );
}

export function Card({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <LiftCard className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="pill">{title}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full px-2.5 py-1 text-sm text-muted transition hover:bg-subtle hover:text-foreground active:scale-95"
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </LiftCard>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-dashed border-line-strong py-4 text-sm font-medium text-muted transition hover:border-foreground hover:bg-surface hover:text-foreground active:scale-[0.99]"
    >
      + {children}
    </button>
  );
}
