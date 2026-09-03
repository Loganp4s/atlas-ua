export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      atlas_memories: {
        Row: {
          category: Database["public"]["Enums"]["atlas_memory_category"]
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["atlas_memory_category"]
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["atlas_memory_category"]
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_preferences: {
        Row: {
          accountability_level: Database["public"]["Enums"]["atlas_accountability"]
          animations_enabled: boolean
          communication_style: Database["public"]["Enums"]["atlas_comm_style"]
          created_at: string
          id: string
          interface_density: Database["public"]["Enums"]["atlas_density"]
          memory_categories: Json
          motivational_messages: boolean
          smart_reminders: boolean
          theme: Database["public"]["Enums"]["atlas_theme"]
          updated_at: string
          use_emojis: boolean
          use_nickname: boolean
          user_id: string
        }
        Insert: {
          accountability_level?: Database["public"]["Enums"]["atlas_accountability"]
          animations_enabled?: boolean
          communication_style?: Database["public"]["Enums"]["atlas_comm_style"]
          created_at?: string
          id?: string
          interface_density?: Database["public"]["Enums"]["atlas_density"]
          memory_categories?: Json
          motivational_messages?: boolean
          smart_reminders?: boolean
          theme?: Database["public"]["Enums"]["atlas_theme"]
          updated_at?: string
          use_emojis?: boolean
          use_nickname?: boolean
          user_id: string
        }
        Update: {
          accountability_level?: Database["public"]["Enums"]["atlas_accountability"]
          animations_enabled?: boolean
          communication_style?: Database["public"]["Enums"]["atlas_comm_style"]
          created_at?: string
          id?: string
          interface_density?: Database["public"]["Enums"]["atlas_density"]
          memory_categories?: Json
          motivational_messages?: boolean
          smart_reminders?: boolean
          theme?: Database["public"]["Enums"]["atlas_theme"]
          updated_at?: string
          use_emojis?: boolean
          use_nickname?: boolean
          user_id?: string
        }
        Relationships: []
      }
      fin_accounts: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          icon: string
          id: string
          initial_balance: number
          name: string
          type: Database["public"]["Enums"]["fin_account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          initial_balance?: number
          name: string
          type?: Database["public"]["Enums"]["fin_account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          initial_balance?: number
          name?: string
          type?: Database["public"]["Enums"]["fin_account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_bills: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          paid_at: string | null
          recurrence: Database["public"]["Enums"]["fin_recurrence"]
          reminder_minutes: number | null
          status: Database["public"]["Enums"]["fin_bill_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          paid_at?: string | null
          recurrence?: Database["public"]["Enums"]["fin_recurrence"]
          reminder_minutes?: number | null
          status?: Database["public"]["Enums"]["fin_bill_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          paid_at?: string | null
          recurrence?: Database["public"]["Enums"]["fin_recurrence"]
          reminder_minutes?: number | null
          status?: Database["public"]["Enums"]["fin_bill_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_goal_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date?: string
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fin_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_goals: {
        Row: {
          color: string
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_objectives: {
        Row: {
          created_at: string
          description: string | null
          desired_date: string | null
          estimated_amount: number | null
          id: string
          linked_goal_id: string | null
          linked_habit_id: string | null
          name: string
          priority: Database["public"]["Enums"]["fin_priority"]
          status: Database["public"]["Enums"]["fin_objective_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          desired_date?: string | null
          estimated_amount?: number | null
          id?: string
          linked_goal_id?: string | null
          linked_habit_id?: string | null
          name: string
          priority?: Database["public"]["Enums"]["fin_priority"]
          status?: Database["public"]["Enums"]["fin_objective_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          desired_date?: string | null
          estimated_amount?: number | null
          id?: string
          linked_goal_id?: string | null
          linked_habit_id?: string | null
          name?: string
          priority?: Database["public"]["Enums"]["fin_priority"]
          status?: Database["public"]["Enums"]["fin_objective_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_objectives_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "fin_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          installment_group: string | null
          installment_index: number | null
          installment_total: number | null
          recurrence: Database["public"]["Enums"]["fin_recurrence"]
          tx_date: string
          type: Database["public"]["Enums"]["fin_tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          installment_group?: string | null
          installment_index?: number | null
          installment_total?: number | null
          recurrence?: Database["public"]["Enums"]["fin_recurrence"]
          tx_date?: string
          type: Database["public"]["Enums"]["fin_tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          installment_group?: string | null
          installment_index?: number | null
          installment_total?: number | null
          recurrence?: Database["public"]["Enums"]["fin_recurrence"]
          tx_date?: string
          type?: Database["public"]["Enums"]["fin_tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      obj_history: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          message: string
          objective_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          message: string
          objective_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          message?: string
          objective_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obj_history_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "obj_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      obj_objectives: {
        Row: {
          ai_context: Json
          ai_summary: string | null
          category: Database["public"]["Enums"]["obj_category"]
          cover_url: string | null
          created_at: string
          current_amount: number
          current_number: number
          deadline: string | null
          description: string | null
          emoji: string
          id: string
          integrations: Json
          manual_progress: number
          name: string
          notes: string | null
          number_unit: string | null
          priority: Database["public"]["Enums"]["obj_priority"]
          simulation: Json
          status: Database["public"]["Enums"]["obj_status"]
          target_amount: number | null
          target_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_context?: Json
          ai_summary?: string | null
          category?: Database["public"]["Enums"]["obj_category"]
          cover_url?: string | null
          created_at?: string
          current_amount?: number
          current_number?: number
          deadline?: string | null
          description?: string | null
          emoji?: string
          id?: string
          integrations?: Json
          manual_progress?: number
          name: string
          notes?: string | null
          number_unit?: string | null
          priority?: Database["public"]["Enums"]["obj_priority"]
          simulation?: Json
          status?: Database["public"]["Enums"]["obj_status"]
          target_amount?: number | null
          target_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_context?: Json
          ai_summary?: string | null
          category?: Database["public"]["Enums"]["obj_category"]
          cover_url?: string | null
          created_at?: string
          current_amount?: number
          current_number?: number
          deadline?: string | null
          description?: string | null
          emoji?: string
          id?: string
          integrations?: Json
          manual_progress?: number
          name?: string
          notes?: string | null
          number_unit?: string | null
          priority?: Database["public"]["Enums"]["obj_priority"]
          simulation?: Json
          status?: Database["public"]["Enums"]["obj_status"]
          target_amount?: number | null
          target_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obj_steps: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          objective_id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          objective_id: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          objective_id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obj_steps_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "obj_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          intro_seen_at: string | null
          nickname: string | null
          occupation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          intro_seen_at?: string | null
          nickname?: string | null
          occupation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          intro_seen_at?: string | null
          nickname?: string | null
          occupation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rotina_events: {
        Row: {
          color: string
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          reminder_minutes: number | null
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          reminder_minutes?: number | null
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rotina_habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "rotina_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_habits: {
        Row: {
          color: string
          created_at: string
          days_of_week: number[]
          description: string | null
          icon: string
          id: string
          name: string
          time_of_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          icon?: string
          id?: string
          name: string
          time_of_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          icon?: string
          id?: string
          name?: string
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rotina_notes: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rotina_tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: Database["public"]["Enums"]["rotina_priority"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["rotina_priority"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["rotina_priority"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      atlas_accountability: "leve" | "normal" | "firme"
      atlas_comm_style:
        | "amigavel"
        | "direto"
        | "motivador"
        | "profissional"
        | "descontraido"
      atlas_density: "confortavel" | "compacta"
      atlas_memory_category:
        | "profile"
        | "preference"
        | "routine"
        | "goal"
        | "personal"
        | "other"
      atlas_theme: "system" | "light" | "dark"
      fin_account_type:
        | "corrente"
        | "poupanca"
        | "carteira"
        | "cartao"
        | "investimento"
      fin_bill_status: "pendente" | "pago"
      fin_objective_status: "ativo" | "pausado" | "concluido"
      fin_priority: "baixa" | "media" | "alta"
      fin_recurrence: "none" | "diaria" | "semanal" | "mensal" | "anual"
      fin_tx_type: "entrada" | "saida"
      obj_category:
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
        | "outro"
      obj_priority: "baixa" | "normal" | "alta" | "muito_alta"
      obj_status:
        | "nao_iniciado"
        | "em_andamento"
        | "quase_concluido"
        | "concluido"
        | "arquivado"
      rotina_priority: "baixa" | "media" | "alta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      atlas_accountability: ["leve", "normal", "firme"],
      atlas_comm_style: [
        "amigavel",
        "direto",
        "motivador",
        "profissional",
        "descontraido",
      ],
      atlas_density: ["confortavel", "compacta"],
      atlas_memory_category: [
        "profile",
        "preference",
        "routine",
        "goal",
        "personal",
        "other",
      ],
      atlas_theme: ["system", "light", "dark"],
      fin_account_type: [
        "corrente",
        "poupanca",
        "carteira",
        "cartao",
        "investimento",
      ],
      fin_bill_status: ["pendente", "pago"],
      fin_objective_status: ["ativo", "pausado", "concluido"],
      fin_priority: ["baixa", "media", "alta"],
      fin_recurrence: ["none", "diaria", "semanal", "mensal", "anual"],
      fin_tx_type: ["entrada", "saida"],
      obj_category: [
        "financeiro",
        "saude",
        "estudos",
        "carreira",
        "casa",
        "relacionamentos",
        "viagens",
        "veiculos",
        "negocios",
        "pessoal",
        "outro",
      ],
      obj_priority: ["baixa", "normal", "alta", "muito_alta"],
      obj_status: [
        "nao_iniciado",
        "em_andamento",
        "quase_concluido",
        "concluido",
        "arquivado",
      ],
      rotina_priority: ["baixa", "media", "alta"],
    },
  },
} as const
