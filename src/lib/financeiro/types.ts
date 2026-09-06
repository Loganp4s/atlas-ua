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