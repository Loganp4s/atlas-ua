export type ObjCategory =
  | "financeiro"
  | "saude"
  | "estudos"
  | "carreira"
  | "casa"
  | "relacionamentos"
  | "viagens"
  | "veiculos"
  | "negocios"
  | "pessoal"
  | "outro";

export type ObjPriority = "baixa" | "normal" | "alta" | "muito_alta";

export type ObjStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "quase_concluido"
  | "concluido"
  | "arquivado";

/** Reservado para simulações futuras (IA). Não exibido ao usuário. */
export interface ObjSimulation {
  kind?: "valor_mensal" | "frequencia_semanal" | "horas_semanais";
  amount?: number | null;
  unit?: string | null;
}

/** Ligações futuras — desativadas. Não exibido ao usuário. */
export interface ObjIntegrations {
  enabled?: boolean;
  financas?: string | null;
  rotinas?: string | null;
  habitos?: string | null;
  agenda?: string | null;
  ia?: string | null;
}

export interface ObjObjective {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  emoji: string;
  cover_url: string | null;
  category: ObjCategory;
  priority: ObjPriority;
  status: ObjStatus;
  deadline: string | null;
  manual_progress: number;
  target_number: number | null;
  current_number: number;
  number_unit: string | null;
  target_amount: number | null;
  current_amount: number;
  notes: string | null;
  ai_summary: string | null;
  ai_context: Record<string, unknown>;
  simulation: ObjSimulation;
  integrations: ObjIntegrations;
  created_at: string;
  updated_at: string;
}

export interface ObjStep {
  id: string;
  user_id: string;
  objective_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ObjHistoryEntry {
  id: string;
  user_id: string;
  objective_id: string;
  event_type: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}