import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flame, MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createHabit,
  deleteHabit,
  listHabitLogs,
  listHabits,
  markHabitDone,
  unmarkHabit,
  updateHabit,
  type HabitInput,
} from "@/lib/rotina/api";
import type { RotinaHabit, RotinaHabitLog } from "@/lib/rotina/types";
import { currentStreak, todayYmd } from "@/lib/rotina/streak";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HabitDialog } from "./HabitDialog";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDays(days: number[]): string {
  if (days.length === 7) return "Todos os dias";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  )
    return "Dias úteis";
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return "Fins de semana";
  return days.map((d) => DAY_LABELS[d]).join(" · ");
}

export function HabitsTab() {
  const qc = useQueryClient();
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ["rotina", "habits"],
    queryFn: listHabits,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["rotina", "habit-logs"],
    queryFn: listHabitLogs,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RotinaHabit | null>(null);

  const today = todayYmd();
  const logsByHabit = useMemo(() => {
    const map = new Map<string, RotinaHabitLog[]>();
    for (const l of logs) {
      const arr = map.get(l.habit_id) ?? [];
      arr.push(l);
      map.set(l.habit_id, arr);
    }
    return map;
  }, [logs]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["rotina", "habits"] });
    qc.invalidateQueries({ queryKey: ["rotina", "habit-logs"] });
  }

  const createMut = useMutation({
    mutationFn: (input: HabitInput) => createHabit(input),
    onSuccess: () => {
      toast.success("Hábito criado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: HabitInput }) =>
      updateHabit(id, input),
    onSuccess: () => {
      toast.success("Hábito atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHabit(id),
    onSuccess: () => {
      toast.success("Hábito removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: async ({ habit, done }: { habit: RotinaHabit; done: boolean }) => {
      if (done) await unmarkHabit(habit.id, today);
      else await markHabitDone(habit.id, today);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(h: RotinaHabit) {
    setEditing(h);
    setDialogOpen(true);
  }
  async function handleSubmit(input: HabitInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {habits.length} hábito{habits.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={openCreate} className="rounded-full">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-5 w-5" strokeWidth={1.75} />}
          title="Sem hábitos ainda"
          description="Crie um hábito e acompanhe sua sequência diária."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((h) => {
            const habitLogs = logsByHabit.get(h.id) ?? [];
            const streak = currentStreak(habitLogs);
            const doneToday = habitLogs.some((l) => l.log_date === today);
            return (
              <li
                key={h.id}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleMut.mutate({ habit: h, done: doneToday })
                  }
                  aria-label={
                    doneToday ? "Desmarcar hoje" : "Marcar como feito hoje"
                  }
                  className={
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition-transform " +
                    (doneToday ? "scale-95 opacity-80" : "")
                  }
                  style={{ backgroundColor: h.color + "22", color: h.color }}
                >
                  {doneToday ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <span>{h.icon}</span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDays(h.days_of_week)}
                    {h.time_of_day ? ` · ${h.time_of_day.slice(0, 5)}` : ""}
                  </p>
                  {streak > 0 ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                      <Flame className="h-3 w-3" strokeWidth={2} />
                      {streak} dia{streak === 1 ? "" : "s"}
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
                    <DropdownMenuItem onClick={() => openEdit(h)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMut.mutate(h.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <HabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}