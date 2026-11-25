import { LoadError } from "@/components/atlas/ConfirmHost";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, PiggyBank, Sparkles, Wallet } from "lucide-react";
import {
  computeBalanceBreakdown,
  listAccounts,
  listBills,
  listTransactions,
  listTransfers,
} from "@/lib/financeiro/api";
import { formatBRL, formatDateBR, todayIso } from "@/lib/financeiro/format";
import { Card } from "@/components/atlas/AppShell";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/components/rotina/useAuthUser";
import { TransferDialog, type TransferMode } from "./TransferDialog";
import { accountBalance } from "@/lib/atlas/finance-query";

export function ResumoTab() {
  const auth = useAuthUser();
  const [transferMode, setTransferMode] = useState<TransferMode | null>(null);
  const accountsQ = useQuery({ queryKey: ["fin", "accounts"], queryFn: listAccounts });
  const txQ = useQuery({ queryKey: ["fin", "tx"], queryFn: listTransactions });
  const billsQ = useQuery({ queryKey: ["fin", "bills"], queryFn: listBills });
  const transfersQ = useQuery({ queryKey: ["fin", "transfers"], queryFn: listTransfers });
  const transfers = transfersQ.data;

  const accounts = accountsQ.data ?? [];
  const tx = txQ.data ?? [];
  const bills = billsQ.data ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTx = tx.filter((t) => t.tx_date.startsWith(monthKey));
    const receitas = monthTx
      .filter((t) => t.type === "entrada")
      .reduce((s, t) => s + Number(t.amount), 0);
    const despesas = monthTx
      .filter((t) => t.type === "saida")
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      breakdown: computeBalanceBreakdown(accounts, tx, transfers ?? []),
      receitas,
      despesas,
      economia: receitas - despesas,
    };
  }, [accounts, tx, transfers]);

  const today = todayIso();
  const upcomingBills = bills
    .filter((b) => b.status === "pendente" && b.due_date >= today)
    .slice(0, 3);
  const recentTx = tx.slice(0, 5);

  if (accountsQ.isError || txQ.isError || billsQ.isError || transfersQ.isError) return <LoadError onRetry={() => { void accountsQ.refetch(); void txQ.refetch(); void billsQ.refetch(); void transfersQ.refetch(); }} />;
  if (accountsQ.isLoading || txQ.isLoading || billsQ.isLoading || transfersQ.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-xs text-muted-foreground">Saldo das contas ativas</p>
        <p className="mt-1 font-display text-3xl font-medium text-foreground">
          {formatBRL(stats.breakdown.active.balance)}
        </p>
        {(stats.breakdown.archived.accountCount > 0 || stats.breakdown.unassigned.transactionCount > 0) && (
          <dl className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            {stats.breakdown.archived.accountCount > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Contas arquivadas</dt>
                <dd className="text-foreground">{formatBRL(stats.breakdown.archived.balance)}</dd>
              </div>
            )}
            {stats.breakdown.unassigned.transactionCount > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Movimentações sem conta</dt>
                <dd className="text-foreground">{formatBRL(stats.breakdown.unassigned.balance)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-border/70 pt-1">
              <dt>Total dos registros</dt>
              <dd className="text-foreground">{formatBRL(stats.breakdown.consolidated)}</dd>
            </div>
            <p className="text-[11px]">O total soma todos os registros e não é dinheiro disponível nas contas ativas.</p>
          </dl>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <MiniStat
            label="Receitas"
            value={formatBRL(stats.receitas)}
            tone="pos"
          />
          <MiniStat
            label="Despesas"
            value={formatBRL(stats.despesas)}
            tone="neg"
          />
          <MiniStat
            label="Economia"
            value={formatBRL(stats.economia)}
            tone={stats.economia >= 0 ? "pos" : "neg"}
          />
        </div>
      </Card>

      <section aria-label="Movimentar entre contas">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Movimentar entre contas</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="px-2" onClick={() => setTransferMode("transferencia")}><ArrowLeftRight className="h-4 w-4" />Transferir</Button>
          <Button variant="outline" size="sm" className="px-2" onClick={() => setTransferMode("saque")}><ArrowDownRight className="h-4 w-4" />Saque</Button>
          <Button variant="outline" size="sm" className="px-2" onClick={() => setTransferMode("deposito")}><ArrowUpRight className="h-4 w-4" />Depósito</Button>
        </div>
      </section>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Próximas contas
        </h3>
        {upcomingBills.length === 0 ? (
          <Card className="text-sm text-muted-foreground">
            Nada previsto por aqui — respire.
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingBills.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Vence em {formatDateBR(b.due_date)}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formatBRL(Number(b.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Últimas movimentações
        </h3>
        {recentTx.length === 0 ? (
          <Card className="flex items-start gap-3 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Nenhuma movimentação ainda.
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentTx.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full " +
                      (t.type === "entrada"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600")
                    }
                  >
                    {t.type === "entrada" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {t.description || t.category || "Movimentação"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateBR(t.tx_date)}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    "text-sm font-medium " +
                    (t.type === "entrada" ? "text-emerald-600" : "text-rose-600")
                  }
                >
                  {t.type === "entrada" ? "+" : "−"}
                  {formatBRL(Number(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Insight Atlas
            </p>
            <p className="mt-1 text-sm text-foreground">
              {stats.economia >= 0
                ? "Você está com balanço positivo este mês. Que tal aportar em uma meta?"
                : "Seus gastos estão acima das entradas. Reveja categorias e ajuste o ritmo."}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <PiggyBank className="h-3 w-3" /> Assistente inteligente em breve.
            </p>
          </div>
        </div>
      </Card>
      <TransferDialog open={transferMode !== null} onOpenChange={(o) => { if (!o) setTransferMode(null); }}
        mode={transferMode ?? "transferencia"} accounts={accounts}
        balanceOf={(a) => accountBalance(a, tx, transfers ?? [])} userId={auth.user?.id} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "pos" | "neg";
}) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-sm font-medium " +
          (tone === "pos" ? "text-emerald-600" : "text-rose-600")
        }
      >
        {value}
      </p>
    </div>
  );
}