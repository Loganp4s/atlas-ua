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
  const { data, error } = await sb
    .from("fin_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FinAccount[];
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
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FinAccount;
}
export async function deleteAccount(id: string): Promise<void> {
  const { error } = await sb.from("fin_accounts").delete().eq("id", id);
  if (error) throw error;
}

/* -------- Transactions -------- */
export async function listTransactions(): Promise<FinTransaction[]> {
  const { data, error } = await sb
    .from("fin_transactions")
    .select("*")
    .order("tx_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinTransaction[];
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
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FinTransaction;
}
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await sb.from("fin_transactions").delete().eq("id", id);
  if (error) throw error;
}

/* -------- Goals -------- */
export async function listGoals(): Promise<FinGoal[]> {
  const { data, error } = await sb
    .from("fin_goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinGoal[];
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
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FinGoal;
}
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await sb.from("fin_goals").delete().eq("id", id);
  if (error) throw error;
}
export async function listGoalContributions(
  goalId: string,
): Promise<FinGoalContribution[]> {
  const { data, error } = await sb
    .from("fin_goal_contributions")
    .select("*")
    .eq("goal_id", goalId)
    .order("contribution_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinGoalContribution[];
}
export async function addGoalContribution(
  goalId: string,
  amount: number,
  contribution_date: string,
  note?: string | null,
): Promise<void> {
  const user_id = await uid();
  const { error } = await sb.from("fin_goal_contributions").insert({
    user_id,
    goal_id: goalId,
    amount,
    contribution_date,
    note: note ?? null,
  });
  if (error) throw error;
  // Update goal current amount
  const { data: g } = await sb
    .from("fin_goals")
    .select("current_amount")
    .eq("id", goalId)
    .single();
  const next = Number(g?.current_amount ?? 0) + amount;
  await sb.from("fin_goals").update({ current_amount: next }).eq("id", goalId);
}

/* -------- Bills -------- */
export async function listBills(): Promise<FinBill[]> {
  const { data, error } = await sb
    .from("fin_bills")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FinBill[];
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
    .eq("id", id)
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
  const { error } = await sb.from("fin_bills").delete().eq("id", id);
  if (error) throw error;
}

/* -------- Balance helper -------- */
export function computeBalance(
  accounts: FinAccount[],
  transactions: FinTransaction[],
): number {
  const base = accounts.reduce((s, a) => s + Number(a.initial_balance || 0), 0);
  const net = transactions.reduce(
    (s, t) =>
      s + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)),
    0,
  );
  return base + net;
}