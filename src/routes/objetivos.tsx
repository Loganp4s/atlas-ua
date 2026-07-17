import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { AppShell, PageHeader, EmptyState } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: "Objetivos — Atlas" },
      { name: "description", content: "Defina e acompanhe seus objetivos no Atlas." },
    ],
  }),
  component: ObjetivosPage,
});

function ObjetivosPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Objetivos"
        description="O lugar dos seus planos, no seu tempo."
      />
      <EmptyState
        icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
        title="Nenhum objetivo ainda"
        description="Quando este módulo estiver disponível, você poderá registrar e acompanhar seus objetivos por aqui."
      />
    </AppShell>
  );
}