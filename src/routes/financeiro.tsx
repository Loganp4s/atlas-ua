import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/atlas/AppShell";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { FinanceAuth } from "@/components/financeiro/FinanceAuth";
import { ResumoTab } from "@/components/financeiro/ResumoTab";
import { MovimentacoesTab } from "@/components/financeiro/MovimentacoesTab";
import { MetasTab } from "@/components/financeiro/MetasTab";
import { ObjetivosTab } from "@/components/financeiro/ObjetivosTab";
import { ContasTab } from "@/components/financeiro/ContasTab";
import { RelatoriosTab } from "@/components/financeiro/RelatoriosTab";
import { InsightsTab } from "@/components/financeiro/InsightsTab";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Atlas" },
      {
        name: "description",
        content:
          "Sua vida financeira no Atlas: movimentações, metas, contas e insights, com clareza.",
      },
      { property: "og:title", content: "Financeiro — Atlas" },
      {
        property: "og:description",
        content: "Uma visão calma do seu dinheiro no Atlas.",
      },
    ],
  }),
  component: FinanceiroPage,
});

type Tab =
  | "resumo"
  | "mov"
  | "metas"
  | "objetivos"
  | "contas"
  | "relatorios"
  | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "mov", label: "Movimentações" },
  { id: "metas", label: "Metas" },
  { id: "objetivos", label: "Objetivos" },
  { id: "contas", label: "Contas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "insights", label: "Insights" },
];

function FinanceiroPage() {
  const auth = useAuthUser();
  const [tab, setTab] = useState<Tab>("resumo");

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
        <FinanceAuth />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Financeiro"
        description="Uma visão tranquila do seu dinheiro."
      />

      <div className="-mx-5 mb-5 overflow-x-auto px-5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "resumo" ? (
        <ResumoTab />
      ) : tab === "mov" ? (
        <MovimentacoesTab />
      ) : tab === "metas" ? (
        <MetasTab />
      ) : tab === "objetivos" ? (
        <ObjetivosTab />
      ) : tab === "contas" ? (
        <ContasTab />
      ) : tab === "relatorios" ? (
        <RelatoriosTab />
      ) : (
        <InsightsTab />
      )}
    </AppShell>
  );
}