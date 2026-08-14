import { X } from "lucide-react";
import { computeProgress } from "@/lib/objetivos/meta";
import type { ObjObjective, ObjStep } from "@/lib/objetivos/types";
import { ObjectiveProgress } from "./ObjectiveProgress";
import { StepsList } from "./StepsList";

export function FocusMode({
  objective,
  steps,
  onToggle,
  onExit,
}: {
  objective: ObjObjective;
  steps: ObjStep[];
  onToggle: (step: ObjStep) => void;
  onExit: () => void;
}) {
  const progress = computeProgress(objective.manual_progress, steps);
  const next = steps.find((s) => !s.done);

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <button
          type="button"
          onClick={onExit}
          className="mb-10 self-end rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Sair do modo foco"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <p className="text-4xl" aria-hidden>
          {objective.emoji || "🎯"}
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
          {objective.name}
        </h1>

        <div className="mt-8">
          <ObjectiveProgress value={progress} size="lg" label="Progresso" />
        </div>

        <div className="mt-8">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Próxima ação
          </p>
          <p className="font-display text-lg text-foreground">
            {next ? next.title : "Tudo concluído por aqui."}
          </p>
        </div>

        <div className="mt-8">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Etapas
          </p>
          <StepsList steps={steps} onToggle={onToggle} compact />
        </div>
      </div>
    </div>
  );
}