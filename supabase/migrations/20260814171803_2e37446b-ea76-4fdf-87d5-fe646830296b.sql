CREATE TYPE public.obj_category AS ENUM ('financeiro','saude','estudos','carreira','casa','relacionamentos','viagens','veiculos','negocios','pessoal','outro');
CREATE TYPE public.obj_priority AS ENUM ('baixa','normal','alta','muito_alta');
CREATE TYPE public.obj_status AS ENUM ('nao_iniciado','em_andamento','quase_concluido','concluido','arquivado');

CREATE TABLE public.obj_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  emoji text NOT NULL DEFAULT '🎯',
  cover_url text,
  category public.obj_category NOT NULL DEFAULT 'pessoal',
  priority public.obj_priority NOT NULL DEFAULT 'normal',
  status public.obj_status NOT NULL DEFAULT 'nao_iniciado',
  deadline date,
  manual_progress integer NOT NULL DEFAULT 0 CHECK (manual_progress >= 0 AND manual_progress <= 100),
  target_number numeric CHECK (target_number IS NULL OR target_number >= 0),
  current_number numeric NOT NULL DEFAULT 0 CHECK (current_number >= 0),
  number_unit text,
  target_amount numeric CHECK (target_amount IS NULL OR target_amount >= 0),
  current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  notes text,
  ai_summary text,
  ai_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulation jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{"financas":null,"rotinas":null,"habitos":null,"agenda":null,"ia":null,"enabled":false}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obj_objectives TO authenticated;
GRANT ALL ON public.obj_objectives TO service_role;
ALTER TABLE public.obj_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obj_objectives_own_select" ON public.obj_objectives FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "obj_objectives_own_insert" ON public.obj_objectives FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obj_objectives_own_update" ON public.obj_objectives FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obj_objectives_own_delete" ON public.obj_objectives FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.obj_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES public.obj_objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  done_at timestamp with time zone,
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX obj_steps_unique_title ON public.obj_steps (objective_id, lower(title));
CREATE INDEX obj_steps_objective_idx ON public.obj_steps (objective_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obj_steps TO authenticated;
GRANT ALL ON public.obj_steps TO service_role;
ALTER TABLE public.obj_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obj_steps_own_select" ON public.obj_steps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "obj_steps_own_insert" ON public.obj_steps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obj_steps_own_update" ON public.obj_steps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obj_steps_own_delete" ON public.obj_steps FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.obj_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES public.obj_objectives(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX obj_history_objective_idx ON public.obj_history (objective_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obj_history TO authenticated;
GRANT ALL ON public.obj_history TO service_role;
ALTER TABLE public.obj_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obj_history_own_select" ON public.obj_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "obj_history_own_insert" ON public.obj_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obj_history_own_delete" ON public.obj_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_obj_objectives_updated BEFORE UPDATE ON public.obj_objectives FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
CREATE TRIGGER trg_obj_steps_updated BEFORE UPDATE ON public.obj_steps FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();