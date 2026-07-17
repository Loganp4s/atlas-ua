import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { AppShell, PageHeader, EmptyState } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina — Atlas" },
      { name: "description", content: "Organize sua rotina diária com o Atlas." },
    ],
  }),
  component: RotinaPage,
});

function RotinaPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Rotina"
        description="Um espaço para acompanhar seu dia a dia com leveza."
      />
      <EmptyState
        icon={<ListChecks className="h-5 w-5" strokeWidth={1.75} />}
        title="Sua rotina começa aqui"
        description="Este módulo será configurado em breve. Em pouco tempo, você poderá organizar hábitos e lembretes neste espaço."
      />
    </AppShell>
  );
}