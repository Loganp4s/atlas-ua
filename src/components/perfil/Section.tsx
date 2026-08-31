import type { ReactNode } from "react";

export function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";
  return (
    <section className="mb-6">
      <h2
        className={
          "mb-1 font-display text-base font-medium " +
          (danger ? "text-destructive" : "text-foreground")
        }
      >
        {title}
      </h2>
      {description ? (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : (
        <div className="mb-3" />
      )}
      <div
        className={
          "rounded-2xl border bg-card p-5 " +
          (danger ? "border-destructive/35 bg-destructive/[0.03]" : "border-border/70")
        }
      >
        {children}
      </div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={
              "rounded-xl border px-3.5 py-2 text-left text-sm transition-all duration-200 disabled:opacity-60 " +
              (active
                ? "border-foreground bg-secondary text-foreground shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")
            }
          >
            <span className="block font-medium">{opt.label}</span>
            {opt.hint ? (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
