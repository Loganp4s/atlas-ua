
-- Enums
CREATE TYPE public.fin_account_type AS ENUM ('corrente','poupanca','carteira','cartao','investimento');
CREATE TYPE public.fin_tx_type AS ENUM ('entrada','saida');
CREATE TYPE public.fin_recurrence AS ENUM ('none','diaria','semanal','mensal','anual');
CREATE TYPE public.fin_bill_status AS ENUM ('pendente','pago');
CREATE TYPE public.fin_priority AS ENUM ('baixa','media','alta');
CREATE TYPE public.fin_objective_status AS ENUM ('ativo','pausado','concluido');

-- Accounts
CREATE TABLE public.fin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.fin_account_type NOT NULL DEFAULT 'corrente',
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#64748b',
  icon TEXT NOT NULL DEFAULT 'wallet',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_accounts TO authenticated;
GRANT ALL ON public.fin_accounts TO service_role;
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_accounts_own_select" ON public.fin_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_accounts_own_insert" ON public.fin_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_accounts_own_update" ON public.fin_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_accounts_own_delete" ON public.fin_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fin_accounts_updated BEFORE UPDATE ON public.fin_accounts FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

-- Transactions
CREATE TABLE public.fin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  account_id UUID REFERENCES public.fin_accounts ON DELETE SET NULL,
  type public.fin_tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT,
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  recurrence public.fin_recurrence NOT NULL DEFAULT 'none',
  installment_group UUID,
  installment_index INT,
  installment_total INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_transactions TO authenticated;
GRANT ALL ON public.fin_transactions TO service_role;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tx_own_select" ON public.fin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_tx_own_insert" ON public.fin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_tx_own_update" ON public.fin_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_tx_own_delete" ON public.fin_transactions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_fin_tx_user_date ON public.fin_transactions(user_id, tx_date DESC);
CREATE TRIGGER trg_fin_tx_updated BEFORE UPDATE ON public.fin_transactions FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

-- Goals
CREATE TABLE public.fin_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  deadline DATE,
  color TEXT NOT NULL DEFAULT '#0ea5e9',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_goals TO authenticated;
GRANT ALL ON public.fin_goals TO service_role;
ALTER TABLE public.fin_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_goals_own_select" ON public.fin_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_goals_own_insert" ON public.fin_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_goals_own_update" ON public.fin_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_goals_own_delete" ON public.fin_goals FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fin_goals_updated BEFORE UPDATE ON public.fin_goals FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

-- Goal contributions
CREATE TABLE public.fin_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.fin_goals ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_goal_contributions TO authenticated;
GRANT ALL ON public.fin_goal_contributions TO service_role;
ALTER TABLE public.fin_goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_gc_own_select" ON public.fin_goal_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_gc_own_insert" ON public.fin_goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_gc_own_update" ON public.fin_goal_contributions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_gc_own_delete" ON public.fin_goal_contributions FOR DELETE USING (auth.uid() = user_id);

-- Bills
CREATE TABLE public.fin_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT,
  due_date DATE NOT NULL,
  status public.fin_bill_status NOT NULL DEFAULT 'pendente',
  recurrence public.fin_recurrence NOT NULL DEFAULT 'none',
  reminder_minutes INT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_bills TO authenticated;
GRANT ALL ON public.fin_bills TO service_role;
ALTER TABLE public.fin_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_bills_own_select" ON public.fin_bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_bills_own_insert" ON public.fin_bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_bills_own_update" ON public.fin_bills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_bills_own_delete" ON public.fin_bills FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fin_bills_updated BEFORE UPDATE ON public.fin_bills FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

-- Objectives (sonhos/projetos)
CREATE TABLE public.fin_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority public.fin_priority NOT NULL DEFAULT 'media',
  desired_date DATE,
  estimated_amount NUMERIC(14,2),
  status public.fin_objective_status NOT NULL DEFAULT 'ativo',
  linked_goal_id UUID REFERENCES public.fin_goals ON DELETE SET NULL,
  linked_habit_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_objectives TO authenticated;
GRANT ALL ON public.fin_objectives TO service_role;
ALTER TABLE public.fin_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_obj_own_select" ON public.fin_objectives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fin_obj_own_insert" ON public.fin_objectives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_obj_own_update" ON public.fin_objectives FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fin_obj_own_delete" ON public.fin_objectives FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fin_obj_updated BEFORE UPDATE ON public.fin_objectives FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
