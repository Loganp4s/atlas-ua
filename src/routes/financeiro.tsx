import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AppShell, PageHeader, EmptyState } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Atlas" },
      { name: "description", content: "Acompanhe sua vida financeira no Atlas." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Financeiro"
        description="Uma visão calma e clara sobre o seu dinheiro."
      />
      <EmptyState
        icon={<Wallet className="h-5 w-5" strokeWidth={1.75} />}
        title="Ainda nada por aqui"
        description="O controle financeiro será disponibilizado em uma próxima etapa. Este módulo está preparado para crescer com você."
      />
    </AppShell>
  );
}