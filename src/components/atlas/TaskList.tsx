import { Check, Trash2 } from "lucide-react";
import type { Task } from "@/lib/atlas/types";
import { PriorityBadge } from "./PriorityBadge";
import { EmptyState } from "./AppShell";
import { ListChecks } from "lucide-react";

export function TaskList({
  tasks,
  onToggle,
  onRemove,
  emptyTitle = "Nada por aqui ainda",
  emptyDescription = "Adicione uma tarefa para começar seu dia com clareza.",
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-5 w-5" strokeWidth={1.75} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
        >
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            aria-pressed={task.done}
            aria-label={task.done ? "Marcar como não feita" : "Marcar como concluída"}
            className={
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors " +
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
                "truncate text-sm " +
                (task.done ? "text-muted-foreground line-through" : "text-foreground")
              }
            >
              {task.title}
            </p>
          </div>
          <PriorityBadge priority={task.priority} />
          <button
            type="button"
            onClick={() => onRemove(task.id)}
            aria-label="Remover tarefa"
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </li>
      ))}
    </ul>
  );
}