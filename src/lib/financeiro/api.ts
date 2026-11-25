import { readAllPages } from "@/lib/read-all-pages";
import { supabase as _sb } from "@/integrations/supabase/client";
import type {
  FinAccount,
  FinBill,
  FinBillStatus,
  FinGoal,
  FinGoalContribution,
  FinRecurrence,
  FinTransaction,
} from "./types";

// Types for fin_* tables are regenerated after migration; cast for now.
const sb = _sb as any;

async function uid(): Promise<string> {
  const { data } = await _sb.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Não autenticado");
  return id;
}

/* -------- Accounts -------- */
export async function listAccounts(): Promise<FinAccount[]> {
  return readAllPages<FinAccount>((count) => sb
    .from("fin_accounts")
    .select("*", { count })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true }));
}
export interface AccountInput {
  name: string;
  type: FinAccount["type"];
  initial_balance: number;
  color: string;
  icon: string;
}
export async function createAccount(input: AccountInput): Promise<FinAccount> {
  const user_id = await uid();
  const { data, error } = await sb
    .from("fin_accounts")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as FinAccount;
}
export async function updateAccount(
  id: string,
  patch: Partial<AccountInput> & { archived?: boolean },
): Promise<FinAccount> {
  const { data, error } = await sb
    .from("fin_accounts")
    .update(patch)
    .eq("id", id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  return data as FinAccount;
}
export async function deleteAccount(id: string): Promise<void> {
  const { error } = await sb.from("fin_accounts").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
}

/* -------- Transactions -------- */
export async function listTransactions(): Promise<FinTransaction[]> {
  return readAllPages<FinTransaction>((count) => sb
    .from("fin_transactions")
    .select("*", { count })
    .order("tx_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }));
}
export interface TransactionInput {
  account_id: string | null;
  type: FinTransaction["type"];
  amount: number;
  category?: string | null;
  description?: string | null;
  tx_date: string;
  recurrence: FinRecurrence;
  installment_total?: number | null;
  installment_index?: number | null;
}
export async function createTransaction(
  input: TransactionInput,
): Promise<FinTransaction> {
  const user_id = await uid();
  const { data, error } = await sb
    .from("fin_transactions")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as FinTransaction;
}
export async function updateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): Promise<FinTransaction> {
  const { data, error } = await sb
    .from("fin_transactions")
    .update(patch)
    .eq("id", id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  return data as FinTransaction;
}
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await sb.from("fin_transactions").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
}

/* -------- Goals -------- */
export async function listGoals(): Promise<FinGoal[]> {
  return readAllPages<FinGoal>((count) => sb
    .from("fin_goals")
    .select("*", { count })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }));
}
export interface GoalInput {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string | null;
  color: string;
}
export async function createGoal(input: GoalInput): Promise<FinGoal> {
  const user_id = await uid();
  const { data, error } = await sb
    .from("fin_goals")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as FinGoal;
}
export async function updateGoal(
  id: string,
  patch: Partial<GoalInput>,
): Promise<FinGoal> {
  const { data, error } = await sb
    .from("fin_goals")
    .update(patch)
    .eq("id", id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  return data as FinGoal;
}
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await sb.from("fin_goals").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
}
export async function listGoalContributions(
  goalId: string,
): Promise<FinGoalContribution[]> {
  return readAllPages<FinGoalContribution>((count) => sb
    .from("fin_goal_contributions")
    .select("*", { count })
    .eq("goal_id", goalId)
    .order("contribution_date", { ascending: false })
    .order("id", { ascending: true }));
}
export async function addGoalContribution(
  goalId: string,
  amount: number,
  contribution_date: string,
  note?: string | null,
): Promise<void> {
  // Atomic: history insert + current_amount increment run in one DB transaction with a row lock.
  const { error } = await sb.rpc("add_fin_goal_contribution", {
    p_goal_id: goalId,
    p_amount: amount,
    p_contribution_date: contribution_date,
    p_note: note ?? undefined,
  });
  if (error) throw error;
}

/* -------- Bills -------- */
export async function listBills(): Promise<FinBill[]> {
  return readAllPages<FinBill>((count) => sb
    .from("fin_bills")
    .select("*", { count })
    .order("due_date", { ascending: true })
    .order("id", { ascending: true }));
}
export interface BillInput {
  name: string;
  amount: number;
  category?: string | null;
  due_date: string;
  status?: FinBillStatus;
  recurrence: FinRecurrence;
  reminder_minutes?: number | null;
  notes?: string | null;
}
export async function createBill(input: BillInput): Promise<FinBill> {
  const user_id = await uid();
  const { data, error } = await sb
    .from("fin_bills")
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as FinBill;
}
export async function updateBill(
  id: string,
  patch: Partial<BillInput> & { paid_at?: string | null },
): Promise<FinBill> {
  const { data, error } = await sb
    .from("fin_bills")
    .update(patch)
    .eq("id", id).eq("user_id", await uid())
    .select()
    .single();
  if (error) throw error;
  return data as FinBill;
}
export async function toggleBillPaid(bill: FinBill): Promise<FinBill> {
  const paying = bill.status !== "pago";
  return updateBill(bill.id, {
    status: paying ? "pago" : "pendente",
    paid_at: paying ? new Date().toISOString() : null,
  });
}
export async function deleteBill(id: string): Promise<void> {
  const { error } = await sb.from("fin_bills").delete().eq("id", id).eq("user_id", await uid());
  if (error) throw error;
}

/* -------- Balance helpers -------- */
export interface BalanceBucket {
  /** Soma dos saldos iniciais das contas do grupo. */
  initial: number;
  entradas: number;
  saidas: number;
  /** initial + entradas - saidas */
  balance: number;
  accountCount: number;
  transactionCount: number;
}

/**
 * Separação do saldo registrado. Cada movimentação entra em exatamente um
 * grupo: conta ativa, conta arquivada ou sem conta (account_id nulo ou de uma
 * conta que não existe mais). `consolidated` = active + archived + unassigned
 * e representa o total dos registros, não dinheiro disponível.
 */
export interface BalanceBreakdown {
  active: BalanceBucket;
  archived: BalanceBucket;
  /** Movimentações sem conta; `initial` e `accountCount` são sempre 0. */
  unassigned: BalanceBucket;
  consolidated: number;
}

function emptyBucket(): BalanceBucket {
  return { initial: 0, entradas: 0, saidas: 0, balance: 0, accountCount: 0, transactionCount: 0 };
}

export function computeBalanceBreakdown(
  accounts: FinAccount[],
  transactions: FinTransaction[],
): BalanceBreakdown {
  const active = emptyBucket();
  const archived = emptyBucket();
  const unassigned = emptyBucket();
  const byId = new Map<string, BalanceBucket>();
  for (const a of accounts) {
    const b = a.archived ? archived : active;
    b.initial += Number(a.initial_balance || 0);
    b.accountCount += 1;
    byId.set(a.id, b);
  }
  for (const t of transactions) {
    const b = (t.account_id && byId.get(t.account_id)) || unassigned;
    const v = Number(t.amount) || 0;
    if (t.type === "entrada") b.entradas += v;
    else b.saidas += v;
    b.transactionCount += 1;
  }
  for (const b of [active, archived, unassigned]) b.balance = b.initial + b.entradas - b.saidas;
  return {
    active,
    archived,
    unassigned,
    consolidated: active.balance + archived.balance + unassigned.balance,
  };
}

/** Saldo das contas ativas: dinheiro registrado nas contas em uso. */
export function computeActiveBalance(
  accounts: FinAccount[],
  transactions: FinTransaction[],
): number {
  return computeBalanceBreakdown(accounts, transactions).active.balance;
}

/**
 * Total consolidado de todos os registros (ativas + arquivadas + sem conta).
 * Mantido por compatibilidade; não representa dinheiro disponível.
 */
export function computeBalance(
  accounts: FinAccount[],
  transactions: FinTransaction[],
): number {
  return computeBalanceBreakdown(accounts, transactions).consolidated;
}
