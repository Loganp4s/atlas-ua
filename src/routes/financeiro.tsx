import { createFileRoute } from "@tanstack/react-router";
import { Wallet, PiggyBank, Target, LineChart } from "lucide-react";
import { AppShell, Card, PageHeader } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Atlas" },
      { name: "description", content: "Sua vida financeira, com clareza e sem pressão." },
    ],
  }),
  component: FinanceiroPage,
});

const preview = [
  {
    Icon: PiggyBank,
    title: "Controle de gastos",
    text: "Registre despesas com poucos toques e veja padrões sem julgamento.",
  },
  {
    Icon: Target,
    title: "Metas financeiras",
    text: "Conecte seus objetivos ao dinheiro que os torna possíveis.",
  },
  {
    Icon: LineChart,
    title: "Uma visão calma",
    text: "Menos números, mais decisões — o essencial em cada momento.",
  },
];

function FinanceiroPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Módulo"
        title="Financeiro"
        description="Uma visão tranquila do seu dinheiro está a caminho."
      />

      <Card className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Wallet className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Em construção</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            O Financeiro chegará com o mesmo cuidado dos outros módulos: sem pressão, apenas clareza.
          </p>
        </div>
      </Card>

      <ul className="flex flex-col gap-3">
        {preview.map(({ Icon, title, text }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}