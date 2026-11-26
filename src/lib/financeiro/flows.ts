/**
 * Fluxo de receitas/despesas. Estorno de pagamento de parcela não é receita:
 * ele desfaz a despesa original, então reduz as saídas em vez de somar entradas.
 * O saldo das contas não depende disto (a entrada compensatória já o corrige).
 */
import type { FinTransaction } from "./types";

type Tx = Pick<FinTransaction, "type" | "amount"> & { reversal_of_transaction_id?: string | null };
export const isReversal = (t: Tx) => !!t.reversal_of_transaction_id;
/** Valor que conta como receita (estornos ficam de fora). */
export const incomeValue = (t: Tx) => (t.type === "entrada" && !isReversal(t) ? Number(t.amount) || 0 : 0);
/** Valor que conta como despesa (estornos entram negativos). */
export const expenseValue = (t: Tx) =>
  t.type === "saida" ? Number(t.amount) || 0 : isReversal(t) ? -(Number(t.amount) || 0) : 0;
/** Movimentações que afetam despesas (saídas e estornos). */
export const affectsExpense = (t: Tx) => t.type === "saida" || isReversal(t);
