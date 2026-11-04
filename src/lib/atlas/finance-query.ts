/**
 * Respostas determinísticas para perguntas financeiras feitas ao Atlas.
 * Usa somente o que o usuário registrou em Finanças; nunca inventa valores.
 */
import { computeBalance } from "@/lib/financeiro/api";
import { formatBRL } from "@/lib/financeiro/format";
import type { FinAccount, FinGoal, FinTransaction } from "@/lib/financeiro/types";
import { normalize, type FinanceQuery } from "./finance-intent";

export interface FinanceSnapshot {
  accounts: FinAccount[];
  transactions: FinTransaction[];
  goals: FinGoal[];
}

const SOURCE_NOTE = "Calculado com o que você registrou em Finanças.";

function monthPrefix(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Per-account balance, same rule as the Contas screen. */
export function accountBalance(account: FinAccount, transactions: FinTransaction[]): number {
  return transactions
    .filter((t) => t.account_id === account.id)
    .reduce((s, t) => s + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)), Number(account.initial_balance || 0));
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
  const month = monthPrefix(now);
  const monthTx = transactions.filter((t) => t.tx_date.startsWith(month));

  switch (query) {
    case "saldo": {
      if (accounts.length === 0 && transactions.length === 0) {
        return "Você ainda não cadastrou contas nem movimentações em Finanças, então ainda não sei seu saldo.";
      }
      return `Seu saldo registrado é ${formatBRL(computeBalance(accounts, transactions))}. ${SOURCE_NOTE}`;
    }
    case "conta_maior": {
      const active = accounts.filter((a) => !a.archived);
      if (active.length === 0) return "Você ainda não cadastrou contas em Finanças.";
      const ranked = active
        .map((a) => ({ a, v: accountBalance(a, transactions) }))
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
      const total = out.reduce((s, t) => s + Number(t.amount), 0);
      let msg = `Neste mês você registrou ${formatBRL(total)} em saídas (${out.length} ${out.length === 1 ? "movimentação" : "movimentações"}).`;
      if (query === "despesas") {
        const byCat: Record<string, number> = {};
        for (const t of out) {
          const k = t.category?.trim() || "Sem categoria";
          byCat[k] = (byCat[k] ?? 0) + Number(t.amount);
        }
        const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
        msg += ` Maiores: ${top.map(([k, v]) => `${k} (${formatBRL(v)})`).join(", ")}.`;
      }
      return `${msg} ${SOURCE_NOTE}`;
    }
    case "entradas_mes": {
      const inc = monthTx.filter((t) => t.type === "entrada");
      if (inc.length === 0) return "Você não registrou entradas neste mês.";
      const total = inc.reduce((s, t) => s + Number(t.amount), 0);
      return `Neste mês você registrou ${formatBRL(total)} em entradas (${inc.length} ${inc.length === 1 ? "movimentação" : "movimentações"}). ${SOURCE_NOTE}`;
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
