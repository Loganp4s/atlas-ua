import { useState } from "react";
import { Card } from "@/components/atlas/AppShell";
import type { FinInstallment, FinInstallmentPlan } from "@/lib/financeiro/types";
import { formatBRL, formatDateBR, todayIso } from "@/lib/financeiro/format";
import { summarizeInstallments } from "@/lib/financeiro/installments";
import { Button } from "@/components/ui/button";

const PERIODS = [{ d: 7, l: "7 dias" }, { d: 30, l: "30 dias" }, { d: 90, l: "90 dias" }, { d: 365, l: "12 meses" }];

/** Previsão: saldo disponível (realizado) vs. parcelas ainda não pagas. */
export function ForecastCard({ available, plans, installments }: { available: number; plans: FinInstallmentPlan[]; installments: FinInstallment[] }) {
  const [days, setDays] = useState(30);
  if (plans.length === 0) return null;
  const s = summarizeInstallments(plans, installments, todayIso(), days);
  const names = new Map(plans.map((p) => [p.id, p]));
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previsão de parcelas</h3>
      </div>
      <div className="mt-2 flex gap-1 rounded-full border border-border bg-card p-1" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <Button key={p.d} type="button" variant="ghost" aria-pressed={days === p.d} onClick={() => setDays(p.d)}
            className={"h-auto flex-1 rounded-full px-2 py-1 text-[11px] font-medium " + (days === p.d ? "bg-foreground text-background" : "text-muted-foreground")}>
            {p.l}
          </Button>
        ))}
      </div>
      <dl className="mt-3 flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Saldo disponível</dt><dd className="text-foreground">{formatBRL(available)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Vencimentos no período ({s.upcomingCount})</dt><dd className="shrink-0 text-foreground">{formatBRL(s.upcoming)}</dd></div>
        {s.overdueCount > 0 ? <div className="flex justify-between gap-2"><dt className="text-destructive">Em atraso ({s.overdueCount})</dt><dd className="text-destructive">{formatBRL(s.overdue)}</dd></div> : null}
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Total considerado ({s.commitmentsCount})</dt><dd className="shrink-0 text-foreground">− {formatBRL(s.commitments)}</dd></div>
        <div className="flex justify-between gap-2 border-t border-border/70 pt-1"><dt className="text-muted-foreground">Projeção após compromissos</dt><dd className="font-medium text-foreground">{formatBRL(available - s.commitments)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Já pago no período</dt><dd className="text-emerald-600">{formatBRL(s.paidInPeriod)}</dd></div>
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">O total considerado inclui atrasos e vencimentos no período.</p>
      {s.next.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-xs">
          {s.next.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-foreground">{names.get(i.plan_id)?.description} {i.number}/{names.get(i.plan_id)?.installment_count}</span>
              <span className="shrink-0 text-muted-foreground">{formatDateBR(i.due_date)} · {formatBRL(Number(i.amount))}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">Previsão — parcelas só saem do saldo quando você confirma o pagamento.</p>
    </Card>
  );
}
