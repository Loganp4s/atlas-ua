import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createObjective,
  deleteObjective,
  listGoals,
  listObjectives,
  updateObjective,
  type ObjectiveInput,
} from "@/lib/financeiro/api";
import type { FinObjective } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR } from "@/lib/financeiro/format";
import { Card, EmptyState } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ObjectiveDialog } from "./ObjectiveDialog";

const PRIORITY_STYLES: Record<string, string> = {
  baixa: "bg-secondary text-muted-foreground",
  media: "bg-accent/15 text-foreground",
  alta: "bg-primary text-primary-foreground",
};
const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-emerald-500/10 text-emerald-700",
  pausado: "bg-amber-500/10 text-amber-700",
  concluido: "bg-muted text-muted-foreground",
};

export function ObjetivosTab() {
  const qc = useQueryClient();
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ["fin", "objectives"],
    queryFn: listObjectives,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["fin", "goals"],
    queryFn: listGoals,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinObjective | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fin", "objectives"] });

  const createMut = useMutation({
    mutationFn: (i: ObjectiveInput) => createObjective(i),
    onSuccess: () => {
      toast.success("Objetivo criado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ObjectiveInput }) =>
      updateObjective(id, input),
    onSuccess: () => {
      toast.success("Atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteObjective(id),
    onSuccess: () => {
      toast.success("Excluído");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSubmit(input: ObjectiveInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sonhos e projetos financeiros
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : objectives.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
          title="Sem objetivos ainda"
          description="Registre seus sonhos e conecte-os às suas metas."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {objectives.map((o) => {
            const linked = goals.find((g) => g.id === o.linked_goal_id);
            return (
              <Card key={o.id} className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{o.name}</p>
                    {o.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {o.description}
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
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(o);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMut.mutate(o.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 font-medium " +
                      PRIORITY_STYLES[o.priority]
                    }
                  >
                    {o.priority}
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 font-medium " +
                      STATUS_STYLES[o.status]
                    }
                  >
                    {o.status}
                  </span>
                  {o.estimated_amount ? (
                    <span className="text-muted-foreground">
                      · {formatBRL(Number(o.estimated_amount))}
                    </span>
                  ) : null}
                  {o.desired_date ? (
                    <span className="text-muted-foreground">
                      · {formatDateBR(o.desired_date)}
                    </span>
                  ) : null}
                  {linked ? (
                    <span className="text-muted-foreground">· meta: {linked.name}</span>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <ObjectiveDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        goals={goals}
        onSubmit={handleSubmit}
      />
    </div>
  );
}