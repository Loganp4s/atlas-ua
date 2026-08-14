import { memo } from "react";
import { CalendarDays } from "lucide-react";
import { categoryMeta, remainingLabel, statusLabel } from "@/lib/objetivos/meta";
import { formatMoney } from "@/lib/objetivos/format";
import type { ObjObjective } from "@/lib/objetivos/types";
import { ObjectiveProgress } from "./ObjectiveProgress";
import { PriorityDots } from "./PriorityDots";

export const ObjectiveCard = memo(function ObjectiveCard({
  objective,
  progress,
  stepsLabel,
  onOpen,
}: {
  objective: ObjObjective;
  progress: number;
  stepsLabel?: string;
  onOpen: (o: ObjObjective) => void;
}) {
  const cat = categoryMeta(objective.category);
  const CatIcon = cat.icon;
  const target = objective.target_amount ? Number(objective.target_amount) : null;
  const current = Number(objective.current_amount ?? 0);

  return (
    <button
      type="button"
      onClick={() => onOpen(objective)}
      className="animate-in fade-in slide-in-from-bottom-1 w-full rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors duration-300 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg"
        >
          {objective.emoji || "🎯"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-medium text-foreground">
            {objective.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CatIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {cat.label}
            <span aria-hidden>·</span>
            {statusLabel(objective.status)}
          </p>
        </div>
        <PriorityDots priority={objective.priority} />
      </div>

      <div className="mt-3">
        <ObjectiveProgress value={progress} label={stepsLabel ?? "Progresso"} />
      </div>

      {target ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Atual</dt>
            <dd className="font-medium text-foreground">{formatMoney(current)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Meta</dt>
            <dd className="font-medium text-foreground">{formatMoney(target)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Restante</dt>
            <dd className="font-medium text-foreground">
              {formatMoney(Math.max(0, target - current))}
            </dd>
          </div>
        </dl>
      ) : null}

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
        {remainingLabel(objective.deadline)}
      </p>
    </button>
  );
});