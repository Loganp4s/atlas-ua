import { useMemo } from "react";
import { previewPlan } from "@/lib/financeiro/installments";
import { formatBRL } from "@/lib/financeiro/format";

function br(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Prévia da série completa (mesma regra do banco). Mostra erro em vez de valores inválidos. */
export function InstallmentPreview({ total, count, first }: { total: number; count: number; first: string }) {
  const result = useMemo(() => {
    try { return { rows: previewPlan(total, count, first) }; } catch (e) { return { error: (e as Error).message }; }
  }, [total, count, first]);
  if ("error" in result) return <p className="text-xs text-destructive">{result.error}</p>;
  const sum = result.rows.reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">
        {count} parcelas · total {formatBRL(sum)} · nada é descontado do saldo até você confirmar cada pagamento.
      </p>
      <ol className="mt-2 max-h-40 overflow-y-auto text-xs" aria-label="Prévia das parcelas">
        {result.rows.map((r) => (
          <li key={r.number} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0">
            <span className="text-muted-foreground">{r.number}/{count}</span>
            <span className="text-foreground">{formatBRL(r.amount)}</span>
            <span className="text-muted-foreground">{br(r.due_date)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
