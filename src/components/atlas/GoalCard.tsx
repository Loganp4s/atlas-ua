import { Target, Trash2, Minus, Plus } from "lucide-react";
import type { Goal } from "@/lib/atlas/types";
import { formatShortDate } from "@/lib/atlas/format";
import { ProgressBar } from "./ProgressBar";

export function GoalCard({
  goal,
  onProgress,
  onRemove,
}: {
  goal: Goal;
  onProgress: (id: string, next: number) => void;
  onRemove: (id: string) => void;
}) {
  const done = goal.status === "concluido";
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Target className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-medium text-foreground">
            {goal.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {goal.deadline ? `Até ${formatShortDate(goal.deadline)}` : "Sem prazo definido"}
            {done ? " · Concluído" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(goal.id)}
          aria-label="Remover objetivo"
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      {goal.description ? (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          {goal.description}
        </p>
      ) : null}

      <ProgressBar value={goal.progress} label="Progresso" />

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onProgress(goal.id, goal.progress - 10)}
          aria-label="Reduzir progresso"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => onProgress(goal.id, goal.progress + 10)}
          aria-label="Avançar progresso"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </article>
  );
}