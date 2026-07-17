import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, Wallet, Target, Sparkles, ArrowUpRight } from "lucide-react";
import { AppShell, Card } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Atlas" },
      {
        name: "description",
        content: "Sua visão geral no Atlas: rotina, finanças e objetivos em um só lugar.",
      },
    ],
  }),
  component: HomePage,
});

const modules = [
  { to: "/rotina", label: "Rotina", Icon: ListChecks },
  { to: "/financeiro", label: "Financeiro", Icon: Wallet },
  { to: "/objetivos", label: "Objetivos", Icon: Target },
] as const;

function HomePage() {
  return (
    <AppShell>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Bem-vindo
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium text-foreground">
          Olá.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Um espaço tranquilo para organizar sua vida, um passo de cada vez.
        </p>
      </header>

      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-primary p-6 text-primary-foreground">
          <div className="relative z-10">
            <p className="font-display text-sm font-medium tracking-wide text-primary-foreground/70">
              Atlas
            </p>
            <h2 className="mt-3 font-display text-2xl font-medium leading-snug">
              Sua vida, organizada com clareza.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
              Rotina, finanças e objetivos convivendo em um só lugar. Comece devagar — o Atlas cresce com você.
            </p>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Seus módulos</h2>
          <span className="text-xs text-muted-foreground">Visão geral</span>
        </div>
        <ul className="grid grid-cols-1 gap-3">
          {modules.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-border"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">Em breve</span>
                  </span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Recomendações</h2>
          <span className="text-xs text-muted-foreground">Em breve</span>
        </div>
        <Card className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Recomendações inteligentes chegarão aqui.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              À medida que você usar o Atlas, sugestões personalizadas aparecerão neste espaço.
            </p>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}