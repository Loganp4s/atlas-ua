import { Card } from "@/components/atlas/AppShell";
import { formatDate } from "@/lib/objetivos/format";
import { remainingLabel } from "@/lib/objetivos/meta";

export function ObjectivesSummary({
  active,
  done,
  overall,
  nextDeadline,
}: {
  active: number;
  done: number;
  overall: number;
  nextDeadline: string | null;
}) {
  const items: { label: string; value: string; hint?: string }[] = [
    { label: "Ativos", value: String(active) },
    { label: "Concluídos", value: String(done) },
    { label: "Progresso geral", value: `${overall}%` },
    {
      label: "Próximo prazo",
      value: nextDeadline ? formatDate(nextDeadline) : "—",
      hint: nextDeadline ? remainingLabel(nextDeadline) : undefined,
    },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="!p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {it.label}
          </p>
          <p className="mt-1 font-display text-lg font-medium text-foreground">
            {it.value}
          </p>
          {it.hint ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{it.hint}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}