import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
  type EventInput,
} from "@/lib/rotina/api";
import type { RotinaEvent } from "@/lib/rotina/types";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventDialog } from "./EventDialog";
import { todayYmd } from "@/lib/rotina/streak";
import { datesCovered, periodLabel, periodPosition } from "@/lib/rotina/events";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  // previous month tail
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const day = prevDays - i;
    const dt = new Date(year, month - 1, day);
    cells.push({
      date: ymd(dt.getFullYear(), dt.getMonth(), day),
      day,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: ymd(year, month, d), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const [ly, lm, ld] = last.date.split("-").map(Number);
    const dt = new Date(ly, lm - 1, ld + 1);
    cells.push({
      date: ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      day: dt.getDate(),
      inMonth: false,
    });
  }
  return cells;
}

export function AgendaTab() {
  const qc = useQueryClient();
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selected, setSelected] = useState<string>(todayYmd());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RotinaEvent | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["rotina", "events"],
    queryFn: listEvents,
  });

  // Um único registro pode ocupar vários dias: aparece em todos eles.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, RotinaEvent[]>();
    for (const e of events) {
      for (const date of datesCovered(e)) {
        const arr = map.get(date) ?? [];
        arr.push(e);
        map.set(date, arr);
      }
    }
    return map;
  }, [events]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor],
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["rotina", "events"] });
  }

  const createMut = useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: () => {
      toast.success("Compromisso criado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EventInput }) =>
      updateEvent(id, input),
    onSuccess: () => {
      toast.success("Compromisso atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      toast.success("Compromisso excluído");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function prevMonth() {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(e: RotinaEvent) {
    setEditing(e);
    setDialogOpen(true);
  }
  async function handleSubmit(input: EventInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  const selectedEvents = eventsByDate.get(selected) ?? [];
  const todayStr = todayYmd();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border/70 bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {MONTHS[cursor.month]} {cursor.year}
          </p>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const dayEvents = eventsByDate.get(cell.date) ?? [];
            const isSelected = cell.date === selected;
            const isToday = cell.date === todayStr;
            return (
              <button
                key={cell.date + (cell.inMonth ? "" : "o")}
                type="button"
                onClick={() => setSelected(cell.date)}
                className={
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors " +
                  (isSelected
                    ? "bg-foreground text-background"
                    : isToday
                      ? "bg-secondary text-foreground"
                      : cell.inMonth
                        ? "text-foreground hover:bg-secondary/50"
                        : "text-muted-foreground/50 hover:bg-secondary/30")
                }
              >
                <span>{cell.day}</span>
                {dayEvents.length > 0 ? (
                  <span className="mt-0.5 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: e.color }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          }).format(new Date(selected + "T00:00:00"))}
        </p>
        <Button size="sm" onClick={openCreate} className="rounded-full">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {selectedEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
          title="Dia livre"
          description="Nenhum compromisso neste dia."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {selectedEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
            >
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: e.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.start_time?.slice(0, 5) ?? "Dia todo"}
                  {e.end_time ? ` – ${e.end_time.slice(0, 5)}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
                {e.description ? (
                  <p className="mt-1 text-xs text-muted-foreground/90">
                    {e.description}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Ações"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(e)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMut.mutate(e.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultDate={selected}
        onSubmit={handleSubmit}
      />
    </div>
  );
}