import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/atlas/AppShell";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { FinanceAuth } from "@/components/financeiro/FinanceAuth";
import { ResumoTab } from "@/components/financeiro/ResumoTab";
import { MovimentacoesTab } from "@/components/financeiro/MovimentacoesTab";
import { MetasTab } from "@/components/financeiro/MetasTab";
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
  | "contas"
  | "relatorios"
  | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "mov", label: "Movimentações" },
  { id: "metas", label: "Metas" },
  { id: "contas", label: "Contas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "insights", label: "Insights" },
];

function FinanceiroPage() {
  const auth = useAuthUser();
  const [tab, setTab] = useState<Tab>("resumo");
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Mantém a aba ativa visível ao trocar de aba ou redimensionar a tela.
  useEffect(() => {
    const reveal = (smooth: boolean) => {
      const el = scrollerRef.current;
      const btn = el?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (!el || !btn) return;
      const pad = 20;
      const left = btn.offsetLeft - el.offsetLeft;
      const right = left + btn.offsetWidth;
      let target = el.scrollLeft;
      if (left - pad < el.scrollLeft) target = left - pad;
      else if (right + pad > el.scrollLeft + el.clientWidth)
        target = right + pad - el.clientWidth;
      if (target !== el.scrollLeft)
        el.scrollTo({ left: Math.max(0, target), behavior: smooth ? "smooth" : "auto" });
    };
    reveal(true);
    const onResize = () => reveal(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tab, auth.status]);

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

      <div
        ref={scrollerRef}
        className="-mx-5 mb-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          role="tablist"
          aria-label="Seções de Finanças"
          className="flex w-max gap-1 rounded-full border border-border bg-card p-1"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-tab={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
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