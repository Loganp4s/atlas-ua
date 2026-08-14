import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState, PageHeader } from "@/components/atlas/AppShell";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { ObjetivosAuth } from "@/components/objetivos/ObjetivosAuth";
import { ObjectivesSummary } from "@/components/objetivos/ObjectivesSummary";
import { ObjectiveCard } from "@/components/objetivos/ObjectiveCard";
import { ObjectiveDialog } from "@/components/objetivos/ObjectiveDialog";
import { ObjectiveDetail } from "@/components/objetivos/ObjectiveDetail";
import {
  createObjective,
  editObjective,
  listAllSteps,
  listObjectives,
  type ObjectiveInput,
} from "@/lib/objetivos/api";
import { computeProgress } from "@/lib/objetivos/meta";
import type { ObjObjective } from "@/lib/objetivos/types";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos — Atlas" },
      {
        name: "description",
        content:
          "Transforme sonhos em planos: objetivos com etapas, prazos e progresso automático no Atlas.",
      },
      { property: "og:title", content: "Objetivos — Atlas" },
      {
        property: "og:description",
        content: "Planejamento de médio e longo prazo com etapas e progresso no Atlas.",
      },
    ],
  }),
  component: ObjetivosPage,
});

function ObjetivosPage() {
  const auth = useAuthUser();

  if (auth.status === "loading") {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (auth.status === "signedOut") {
    return (
      <AppShell>
        <ObjetivosAuth />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ObjetivosContent />
    </AppShell>
  );
}

function ObjetivosContent() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ObjObjective | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ["objetivos", "list"],
    queryFn: listObjectives,
  });
  const { data: allSteps = [] } = useQuery({
    queryKey: ["objetivos", "steps", "all"],
    queryFn: listAllSteps,
  });

  const stepsByObjective = useMemo(() => {
    const map = new Map<string, { done: boolean }[]>();
    for (const s of allSteps) {
      const arr = map.get(s.objective_id) ?? [];
      arr.push({ done: s.done });
      map.set(s.objective_id, arr);
    }
    return map;
  }, [allSteps]);

  const progressOf = (o: ObjObjective) =>
    computeProgress(o.manual_progress, stepsByObjective.get(o.id) ?? []);

  const summary = useMemo(() => {
    const visible = objectives.filter((o) => o.status !== "arquivado");
    const done = visible.filter((o) => o.status === "concluido").length;
    const active = visible.length - done;
    const overall = visible.length
      ? Math.round(visible.reduce((acc, o) => acc + progressOf(o), 0) / visible.length)
      : 0;
    const nextDeadline =
      visible
        .filter((o) => o.deadline && o.status !== "concluido")
        .map((o) => o.deadline as string)
        .sort()[0] ?? null;
    return { active, done, overall, nextDeadline };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectives, stepsByObjective]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["objetivos"] });

  const createMut = useMutation({
    mutationFn: (input: ObjectiveInput) => createObjective(input),
    onSuccess: () => {
      toast.success("Objetivo criado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const editMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ObjectiveInput }) =>
      editObjective(id, input),
    onSuccess: () => {
      toast.success("Objetivo atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = objectives.find((o) => o.id === selectedId) ?? null;

  async function handleSubmit(input: ObjectiveInput) {
    if (editing) await editMut.mutateAsync({ id: editing.id, input });
    else await createMut.mutateAsync(input);
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo"
        title="Objetivos"
        description="Transforme sonhos em planos."
      />

      <ObjectivesSummary
        active={summary.active}
        done={summary.done}
        overall={summary.overall}
        nextDeadline={summary.nextDeadline}
      />

      {isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : objectives.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
          title="Nenhum objetivo ainda"
          description="Crie seu primeiro objetivo e quebre-o em etapas simples."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {objectives.map((o) => {
            const steps = stepsByObjective.get(o.id) ?? [];
            return (
              <li key={o.id}>
                <ObjectiveCard
                  objective={o}
                  progress={progressOf(o)}
                  stepsLabel={
                    steps.length
                      ? `Etapas ${steps.filter((s) => s.done).length}/${steps.length}`
                      : "Progresso"
                  }
                  onOpen={(obj) => setSelectedId(obj.id)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        aria-label="Criar novo objetivo"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>

      <ObjectiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <ObjectiveDetail
        objective={selected}
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelectedId(null);
        }}
        onEdit={(o) => {
          setSelectedId(null);
          setEditing(o);
          setDialogOpen(true);
        }}
      />
    </>
  );
}