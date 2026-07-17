import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/atlas/AppShell";
import { GoalCard } from "@/components/atlas/GoalCard";
import { GoalComposer } from "@/components/atlas/GoalComposer";
import { useGoals } from "@/hooks/useAtlas";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos — Atlas" },
      { name: "description", content: "Defina objetivos e acompanhe seu progresso no Atlas." },
    ],
  }),
  component: ObjetivosPage,
});

function ObjetivosPage() {
  const { goals, addGoal, setGoalProgress, removeGoal } = useGoals();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Objetivos"
        description="Transforme sonhos grandes em passos do dia a dia."
      />

      <div className="mb-5">
        <GoalComposer onAdd={addGoal} />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
          title="Nenhum objetivo ainda"
          description="Comece com um objetivo simples. Você poderá acompanhar seu progresso aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} onProgress={setGoalProgress} onRemove={removeGoal} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}