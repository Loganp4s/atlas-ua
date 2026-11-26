/**
 * Respostas determinísticas para perguntas financeiras feitas ao Atlas.
 * Usa somente o que o usuário registrou em Finanças; nunca inventa valores.
 */
import { computeBalanceBreakdown } from "@/lib/financeiro/api";
import { formatBRL, formatDateBR } from "@/lib/financeiro/format";
import type { FinAccount, FinGoal, FinInstallment, FinInstallmentPlan, FinTransaction, FinTransfer } from "@/lib/financeiro/types";
import { summarizeInstallments } from "@/lib/financeiro/installments";
import { expenseValue, isReversal } from "@/lib/financeiro/flows";
import { normalize, type FinanceQuery } from "./finance-intent";

export interface FinanceSnapshot {
  accounts: FinAccount[];
  transactions: FinTransaction[];
  goals: FinGoal[];
  /** Opcional: transferências entre contas (não são receita nem despesa). */
  transfers?: FinTransfer[];
  /** Opcional: parcelamentos (compromissos previstos, não despesas realizadas). */
  installmentPlans?: FinInstallmentPlan[];
  installments?: FinInstallment[];
}

const SOURCE_NOTE = "Calculado com o que você registrou em Finanças.";

function monthPrefix(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Per-account balance, same rule as the Contas screen. */
export function accountBalance(account: FinAccount, transactions: FinTransaction[], transfers: FinTransfer[] = []): number {
  const base = transactions
    .filter((t) => t.account_id === account.id)
    .reduce((s, t) => s + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)), Number(account.initial_balance || 0));
  return transfers.reduce((s, t) =>
    s + (t.destination_account_id === account.id ? Number(t.amount) : 0)
      - (t.source_account_id === account.id ? Number(t.amount) : 0), base);
}

/**
 * Accounts whose name appears as a whole phrase in the text. The Composer
 * preselects only a single unambiguous match; otherwise it asks.
 */
export function matchAccounts(text: string, accounts: FinAccount[]): FinAccount[] {
  const n = normalize(text);
  return accounts.filter((a) => {
    if (a.archived) return false;
    const name = normalize(a.name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return name.length > 1 && new RegExp(`(?:^|[^a-z0-9])${name}(?:$|[^a-z0-9])`).test(n);
  });
}

export function answerFinanceQuery(query: FinanceQuery, data: FinanceSnapshot, now = new Date()): string {
  const { accounts, transactions, goals } = data;
  const transfers = data.transfers ?? [];
  const month = monthPrefix(now);
  const monthTx = transactions.filter((t) => t.tx_date.startsWith(month));

  switch (query) {
    case "saldo": {
      if (accounts.length === 0 && transactions.length === 0) {
        return "Você ainda não cadastrou contas nem movimentações em Finanças, então ainda não sei seu saldo.";
      }
      const bd = computeBalanceBreakdown(accounts, transactions, transfers);
      const extras: string[] = [];
      if (bd.archived.accountCount > 0) extras.push(`contas arquivadas: ${formatBRL(bd.archived.balance)}`);
      if (bd.unassigned.transactionCount > 0) extras.push(`movimentações sem conta: ${formatBRL(bd.unassigned.balance)}`);
      const head = bd.active.accountCount > 0
        ? `O saldo das suas contas ativas é ${formatBRL(bd.active.balance)}.`
        : "Você não tem contas ativas em Finanças.";
      const tail = extras.length > 0 ? ` Fora desse saldo: ${extras.join("; ")}.` : "";
      return `${head}${tail} ${SOURCE_NOTE}`;
    }
    case "conta_maior": {
      const active = accounts.filter((a) => !a.archived);
      if (active.length === 0) return "Você ainda não cadastrou contas em Finanças.";
      const ranked = active
        .map((a) => ({ a, v: accountBalance(a, transactions, transfers) }))
        .sort((x, y) => y.v - x.v);
      if (ranked.length > 1 && ranked[0].v === ranked[1].v) {
        return `Suas contas ${ranked[0].a.name} e ${ranked[1].a.name} estão empatadas com ${formatBRL(ranked[0].v)}. ${SOURCE_NOTE}`;
      }
      return `A conta com mais dinheiro é ${ranked[0].a.name}, com ${formatBRL(ranked[0].v)}. ${SOURCE_NOTE}`;
    }
    case "gastos_mes":
    case "despesas": {
      const out = monthTx.filter((t) => t.type === "saida");
      if (out.length === 0) return "Você não registrou saídas neste mês.";
      // Estornos de parcela desfazem a saída original: entram negativos.
      const total = monthTx.reduce((s, t) => s + expenseValue(t), 0);
      let msg = `Neste mês você registrou ${formatBRL(total)} em saídas (${out.length} ${out.length === 1 ? "movimentação" : "movimentações"}).`;
      if (query === "despesas") {
        const byCat: Record<string, number> = {};
        for (const t of out) {
          const k = t.category?.trim() || "Sem categoria";
          byCat[k] = (byCat[k] ?? 0) + Number(t.amount);
        }
        for (const t of monthTx.filter(isReversal)) {
          const k = t.category?.trim() || "Sem categoria";
          byCat[k] = (byCat[k] ?? 0) + expenseValue(t);
        }
        const top = Object.entries(byCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
        msg += ` Maiores: ${top.map(([k, v]) => `${k} (${formatBRL(v)})`).join(", ")}.`;
      }
      return `${msg} ${SOURCE_NOTE}`;
    }
    case "entradas_mes": {
      const inc = monthTx.filter((t) => t.type === "entrada" && !isReversal(t));
      if (inc.length === 0) return "Você não registrou entradas neste mês.";
      const total = inc.reduce((s, t) => s + Number(t.amount), 0);
      return `Neste mês você registrou ${formatBRL(total)} em entradas (${inc.length} ${inc.length === 1 ? "movimentação" : "movimentações"}). ${SOURCE_NOTE}`;
    }
    case "parcelas": {
      const plans = data.installmentPlans ?? [];
      if (plans.length === 0) return "Você não tem compras parceladas registradas em Finanças.";
      const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const s30 = summarizeInstallments(plans, data.installments ?? [], ymd, 30);
      const all = summarizeInstallments(plans, data.installments ?? [], ymd, 36500);
      if (all.commitmentsCount === 0) return `Não há parcelas em aberto. ${SOURCE_NOTE}`;
      const next = all.next[0];
      let msg = `Você tem ${formatBRL(s30.upcoming)} em parcelas previstas para os próximos 30 dias e ${formatBRL(all.commitments)} em aberto no total (${all.commitmentsCount} ${all.commitmentsCount === 1 ? "parcela" : "parcelas"}).`;
      if (all.overdueCount > 0) msg += ` ${formatBRL(all.overdue)} já venceram e aguardam sua confirmação de pagamento.`;
      if (next) msg += ` Próximo vencimento: ${formatDateBR(next.due_date)} (${formatBRL(Number(next.amount))}).`;
      return `${msg} São previsões — só saem do saldo quando você confirma o pagamento. ${SOURCE_NOTE}`;
    }
    case "meta": {
      if (goals.length === 0) return "Você ainda não tem metas financeiras em Finanças.";
      const parts = goals.slice(0, 3).map((g) => {
        const left = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
        return left === 0 ? `${g.name}: concluída` : `${g.name}: faltam ${formatBRL(left)}`;
      });
      const more = goals.length > 3 ? ` e mais ${goals.length - 3}` : "";
      return `${parts.join("; ")}${more}.`;
    }
  }
}
