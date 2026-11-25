import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addGoalContribution,
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
  type GoalInput,
} from "@/lib/financeiro/api";
import type { FinGoal } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR, todayIso } from "@/lib/financeiro/format";
import { Card, EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoalDialog } from "./GoalDialog";
import { parseContributionAmount } from "@/lib/financeiro/contribution";
import { confirmDelete, LoadError } from "@/components/atlas/ConfirmHost";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { clearPending, markPendingConflict, preparePending, readPending, withContributionLock, type PendingContribution } from "@/lib/financeiro/pending-contribution";

const EMPTY_GOALS: FinGoal[] = [];

export function MetasTab() {
  const qc = useQueryClient();
  const auth = useAuthUser();
  const userId = auth.user?.id;
  const [pending, setPending] = useState<Record<string, PendingContribution>>({});
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const { data: goals = EMPTY_GOALS, isLoading, isError, refetch } = useQuery({
    queryKey: ["fin", "goals"],
    queryFn: listGoals,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinGoal | null>(null);
  const [contribAmount, setContribAmount] = useState<Record<string, string>>({});

  useEffect(() => {
    function recover() {
      setRecoveryReady(false);
      if (!userId) { setPending({}); return; }
      try {
        const found: Record<string, PendingContribution> = {};
        for (const goal of goals) {
          const p = readPending(localStorage, userId, goal.id);
          if (p) found[goal.id] = p;
        }
        setPending(found);
        setRecoveryError("");
        setRecoveryReady(true);
      } catch {
        setRecoveryError("Não foi possível recuperar as tentativas de aporte. Nenhum novo aporte será enviado até recuperar o armazenamento deste navegador.");
      }
    }
    recover();
    window.addEventListener("storage", recover);
    return () => window.removeEventListener("storage", recover);
  }, [userId, goals]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fin", "goals"] });

  const createMut = useMutation({
    mutationFn: (i: GoalInput) => createGoal(i),
    onSuccess: () => {
      toast.success("Meta criada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: GoalInput }) =>
      updateGoal(id, input),
    onSuccess: () => {
      toast.success("Atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      toast.success("Meta excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const contribMut = useMutation({
    mutationFn: async ({ goalId, amount, userId: owner }: { goalId: string; amount: number; userId: string }) =>
      withContributionLock(owner, goalId, async () => {
        // Re-read under a cross-tab lock; never replace an unresolved operation.
        const p = preparePending(localStorage, owner, goalId, amount, todayIso(), () => crypto.randomUUID());
        setPending((m) => ({ ...m, [goalId]: p }));
        try {
          await addGoalContribution(p.goalId, p.amount, p.date, p.note, p.requestId, p.userId);
        } catch (error) {
          if (typeof error === "object" && error !== null && "code" in error && error.code === "PT409") {
            markPendingConflict(localStorage, p);
            setPending((m) => ({ ...m, [goalId]: { ...p, conflict: true } }));
          }
          throw error; // All unknown outcomes retain the exact persisted operation.
        }
        clearPending(localStorage, p);
        return p;
      }),
    onSuccess: (p) => {
      setPending((m) => { const next = { ...m }; if (next[p.goalId]?.requestId === p.requestId) delete next[p.goalId]; return next; });
      setContribAmount((m) => ({ ...m, [p.goalId]: "" }));
      toast.success("Aporte registrado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSubmit(input: GoalInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {goals.length} meta{goals.length === 1 ? "" : "s"}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {recoveryError && <p role="alert" className="text-xs text-destructive">{recoveryError}</p>}

      {isError ? (
        <LoadError onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="h-5 w-5" strokeWidth={1.75} />}
          title="Sem metas ainda"
          description="Crie uma meta financeira e acompanhe seu progresso."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(g.current_amount) / Math.max(1, Number(g.target_amount))) * 100,
              ),
            );
            const attempt = pending[g.id];
            const val = attempt ? String(attempt.amount) : contribAmount[g.id] ?? "";
            return (
              <Card key={g.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBRL(Number(g.current_amount))} de {formatBRL(Number(g.target_amount))}
                      {g.deadline ? ` · até ${formatDateBR(g.deadline)}` : ""}
                    </p>
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
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(g);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!!attempt || contribMut.isPending}
                        onClick={async () => { if (await confirmDelete("Excluir meta?")) deleteMut.mutate(g.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, backgroundColor: g.color }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                    {pct}% concluído
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ aporte"
                    value={val}
                    aria-label={`Aporte em ${g.name}`}
                    disabled={!!attempt || !recoveryReady || contribMut.isPending}
                    onChange={(e) =>
                      setContribAmount({ ...contribAmount, [g.id]: e.target.value })
                    }
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    disabled={!userId || !recoveryReady || !!attempt?.conflict || parseContributionAmount(val) === null || contribMut.isPending}
                    onClick={() => {
                      const amount = parseContributionAmount(val);
                      if (amount === null || !userId) return;
                      contribMut.mutate({ goalId: g.id, amount, userId });
                    }}
                  >
                    {attempt ? "Confirmar aporte" : "Aportar"}
                  </Button>
                </div>
                {attempt && <p role="status" className="text-xs text-muted-foreground">{attempt.conflict ? "Conflito confirmado. Este aporte precisa ser verificado; nenhum novo valor foi enviado." : "Há um aporte aguardando confirmação. Confirme esta tentativa antes de informar outro valor."}</p>}
              </Card>
            );
          })}
        </ul>
      )}

      <GoalDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}