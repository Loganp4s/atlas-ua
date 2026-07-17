import { CalendarClock, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/lib/atlas/types";
import { formatShortDate } from "@/lib/atlas/format";
import { EmptyState } from "./AppShell";

export function EventList({
  events,
  onRemove,
  emptyTitle = "Sem compromissos",
  emptyDescription = "Você ainda não tem nada agendado.",
}: {
  events: CalendarEvent[];
  onRemove: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-5 w-5" strokeWidth={1.75} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const sorted = [...events].sort((a, b) => {
    const ak = `${a.date}T${a.time ?? "00:00"}`;
    const bk = `${b.date}T${b.time ?? "00:00"}`;
    return ak.localeCompare(bk);
  });

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((event) => (
        <li
          key={event.id}
          className="group flex gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
        >
          <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary py-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatShortDate(event.date).split(" ")[0]}
            </span>
            <span className="mt-0.5 font-display text-lg font-medium text-foreground">
              {event.date.split("-")[2]}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {event.time ? `${event.time} · ` : ""}
              {formatShortDate(event.date)}
            </p>
            {event.description ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(event.id)}
            aria-label="Remover compromisso"
            className="self-start rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </li>
      ))}
    </ul>
  );
}