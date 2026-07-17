import { createFileRoute } from "@tanstack/react-router";
import { User, Settings, Palette, ShieldCheck, ChevronRight } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { AppShell, PageHeader, Card } from "@/components/atlas/AppShell";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Atlas" },
      { name: "description", content: "Ajuste suas preferências no Atlas." },
    ],
  }),
  component: PerfilPage,
});

type Row = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const rows: Row[] = [
  { label: "Configurações", Icon: Settings },
  { label: "Tema", Icon: Palette },
  { label: "Conta", Icon: ShieldCheck },
];

function PerfilPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Você" title="Perfil" />

      <Card className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <User className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-medium text-foreground">
            Seu nome
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Perfil ainda não configurado</p>
        </div>
      </Card>

      <ul className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {rows.map(({ label, Icon }, i) => (
          <li
            key={label}
            className={
              "flex items-center justify-between px-4 py-4 " +
              (i < rows.length - 1 ? "border-b border-border/60" : "")
            }
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}