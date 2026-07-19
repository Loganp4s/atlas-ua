import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTaskDone,
  updateTask,
  type TaskInput,
} from "@/lib/rotina/api";
import type { RotinaTask } from "@/lib/rotina/types";
import { EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskDialog } from "./TaskDialog";

const PRIORITY_STYLES: Record<string, string> = {
  baixa: "bg-secondary text-muted-foreground",
  media: "bg-accent/15 text-foreground",
  alta: "bg-primary text-primary-foreground",
};
const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

function formatDue(task: RotinaTask): string | null {
  if (!task.due_date) return null;
  const [y, m, d] = task.due_date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const s = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dt);
  const time = task.due_time?.slice(0, 5);
  return time ? `${s} · ${time}` : s;
}

export function TasksTab() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["rotina", "tasks"],
    queryFn: listTasks,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RotinaTask | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["rotina", "tasks"] });
  }

  const createMut = useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => {
      toast.success("Tarefa criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) =>
      updateTask(id, input),
    onSuccess: () => {
      toast.success("Tarefa atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (t: RotinaTask) => toggleTaskDone(t),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      toast.success("Tarefa excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(t: RotinaTask) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleSubmit(input: TaskInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {pending.length} pendente{pending.length === 1 ? "" : "s"} · {done.length} concluída
          {done.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={openCreate} className="rounded-full">
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" strokeWidth={1.75} />}
          title="Sua rotina começa aqui"
          description="Adicione a primeira tarefa e organize seu dia com clareza."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {[...pending, ...done].map((task) => (
            <li
              key={task.id}
              className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
            >
              <button
                type="button"
                onClick={() => toggleMut.mutate(task)}
                aria-pressed={task.done}
                aria-label={
                  task.done ? "Marcar como não feita" : "Marcar como concluída"
                }
                className={
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors " +
                  (task.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-transparent hover:border-foreground")
                }
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "text-sm " +
                    (task.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground")
                  }
                >
                  {task.title}
                </p>
                {task.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {task.description}
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {formatDue(task) ? <span>{formatDue(task)}</span> : null}
                  {task.category ? <span>· {task.category}</span> : null}
                </div>
              </div>
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  PRIORITY_STYLES[task.priority]
                }
              >
                {PRIORITY_LABEL[task.priority]}
              </span>
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
                  <DropdownMenuItem onClick={() => openEdit(task)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMut.mutate(task.id)}
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

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}