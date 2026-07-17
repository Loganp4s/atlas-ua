import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-3xl font-medium text-foreground">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}