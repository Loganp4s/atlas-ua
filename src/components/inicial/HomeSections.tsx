import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarClock, CheckCircle2, Repeat } from "lucide-react";
import { Card } from "@/components/atlas/AppShell";
import type { DayItem, Possibility, WorldCard } from "@/lib/inicial/derive";

const KIND_ICON = {
  evento: CalendarClock,
  tarefa: CheckCircle2,
  habito: Repeat,
} as const;

export function DaySection({ items }: { items: DayItem[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-medium text-foreground">Seu dia</h2>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nada marcado para hoje. Isso também é um bom sinal.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.time ? item.time : "sem horário"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function PossibilitySection({ possibility }: { possibility: Possibility }) {
  return (
    <section className="mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-primary p-6 text-primary-foreground">
        <div className="relative z-10">
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            Uma possibilidade
          </p>
          <p className="mt-3 font-display text-xl font-medium leading-snug">
            {possibility.text}
          </p>
          <Link
            to={possibility.to}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/20"
          >
            {possibility.actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
        />
      </div>
    </section>
  );
}

export function WorldCarousel({ cards }: { cards: WorldCard[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-medium text-foreground">Seu mundo</h2>
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex snap-x snap-mandatory gap-3">
          {cards.map((card) => (
            <li key={card.key} className="min-w-[10.5rem] shrink-0 snap-start">
              <Link
                to={card.to}
                className="flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:bg-secondary/50"
              >
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p
                  className={
                    "mt-3 font-display text-lg font-medium " +
                    (card.empty ? "text-muted-foreground" : "text-foreground")
                  }
                >
                  {card.primary}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {card.secondary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ClosingSection({ note }: { note: string }) {
  return (
    <section className="pb-4 pt-2 text-center">
      <p className="mx-auto max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
        {note}
      </p>
    </section>
  );
}
