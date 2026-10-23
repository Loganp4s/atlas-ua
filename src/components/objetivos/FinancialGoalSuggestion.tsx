import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GoalDialog } from "@/components/financeiro/GoalDialog";
import { createGoal, listGoals, type GoalInput } from "@/lib/financeiro/api";
import { listObjectives, updateObjective } from "@/lib/objetivos/api";
import { needsFinancialGoal, relatedFinancialGoal } from "@/lib/objetivos/financial";
import type { ObjObjective } from "@/lib/objetivos/types";
import type { FinGoal } from "@/lib/financeiro/types";
import { LoadError } from "@/components/atlas/ConfirmHost";

export function FinancialGoalSuggestion({ objective, onDismiss }: { objective: ObjObjective; onDismiss: () => void }) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const created = useRef<FinGoal | null>(null);
  const { data: goals = [], isLoading, isError, refetch } = useQuery({ queryKey: ["financeiro", "goals"], queryFn: listGoals });
  const related = relatedFinancialGoal(objective, goals);

  async function connect(input?: GoalInput) {
    if (busy) return;
    setBusy(true);
    try {
      const latest = (await listObjectives()).find((o) => o.id === objective.id);
      if (!latest) throw new Error("O objetivo não está mais disponível.");
      if (latest.linked_goal_id) { onDismiss(); return; }
      const existing = relatedFinancialGoal(latest, await listGoals());
      let goal = created.current ?? existing;
      if (!goal && input) {
        goal = await createGoal(input);
        created.current = goal; // Retry linking this same goal if the next write fails.
      }
      if (!goal) throw new Error("Não encontrei essa meta. Tente novamente.");
      await updateObjective(objective.id, { linked_goal_id: goal.id });
      await qc.invalidateQueries({ queryKey: ["objetivos"] });
      toast.success("Meta financeira vinculada ao objetivo");
      onDismiss();
    } catch (err) {
      toast.error(created.current ? "A meta foi criada, mas o vínculo falhou. Tente novamente para vincular a mesma meta." : err instanceof Error ? err.message : "Não foi possível criar a meta.");
      throw err;
    } finally {
      await qc.invalidateQueries({ queryKey: ["financeiro", "goals"] });
      setBusy(false);
    }
  }

  if (!needsFinancialGoal(objective)) return null;
  return (
    <section className="mb-5 border-l-2 border-primary pl-4" aria-label="Sugestão financeira">
      <p className="text-sm text-foreground">{related ? `A meta “${related.name}” já existe em Finanças. Quer vinculá-la a este objetivo?` : "Esse objetivo pode ficar mais fácil de acompanhar com uma meta financeira. Quer criar uma meta em Finanças para ele?"}</p>
      {isError ? <LoadError onRetry={() => refetch()} /> : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || isLoading} onClick={() => { if (related || created.current) void connect().catch(() => {}); else setFormOpen(true); }}>
            {busy ? "Vinculando..." : related || created.current ? "Vincular meta financeira" : "Criar meta financeira"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>Agora não</Button>
        </div>
      )}
      <GoalDialog open={formOpen} onOpenChange={setFormOpen} defaults={{ name: objective.name, target_amount: objective.target_amount ?? undefined, deadline: objective.deadline }} onSubmit={connect} />
    </section>
  );
}