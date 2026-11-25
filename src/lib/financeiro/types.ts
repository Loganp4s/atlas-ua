export type FinAccountType =
  | "corrente"
  | "poupanca"
  | "carteira"
  | "cartao"
  | "investimento";
export type FinTxType = "entrada" | "saida";
export type FinRecurrence = "none" | "diaria" | "semanal" | "mensal" | "anual";
export type FinBillStatus = "pendente" | "pago";
export type FinPriority = "baixa" | "media" | "alta";
export type FinObjectiveStatus = "ativo" | "pausado" | "concluido";

export interface FinAccount {
  id: string;
  user_id: string;
  name: string;
  type: FinAccountType;
  initial_balance: number;
  color: string;
  icon: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: FinTxType;
  amount: number;
  category: string | null;
  description: string | null;
  tx_date: string;
  recurrence: FinRecurrence;
  installment_total: number | null;
  installment_index: number | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface FinGoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  note: string | null;
  created_at: string;
}

export interface FinBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string | null;
  due_date: string;
  status: FinBillStatus;
  recurrence: FinRecurrence;
  reminder_minutes: number | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Objetivos agora vivem exclusivamente no módulo central (obj_objectives).
 * A tabela legada fin_objectives foi mantida no banco apenas como histórico;
 * Finanças cuida de entradas, saídas, metas, contas e relatórios.
 */
export interface FinTransfer {
  id: string;
  user_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  transfer_date: string;
  description: string | null;
  client_request_id: string | null;
  created_at: string;
}

export type FinInstallmentPlanStatus = "ativo" | "concluido" | "cancelado";
export type FinInstallmentStatus = "aberta" | "paga" | "cancelada";
/** Compra parcelada (compromisso). As parcelas abertas não são movimentações. */
export interface FinInstallmentPlan {
  id: string;
  user_id: string;
  account_id: string | null;
  description: string;
  category: string | null;
  total_amount: number;
  installment_count: number;
  first_due_date: string;
  status: FinInstallmentPlanStatus;
  client_request_id: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface FinInstallment {
  id: string;
  user_id: string;
  plan_id: string;
  number: number;
  amount: number;
  due_date: string;
  status: FinInstallmentStatus;
  /** Data efetiva do pagamento (diferente do vencimento). */
  paid_at: string | null;
  paid_account_id: string | null;
  transaction_id: string | null;
  pay_request_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}
