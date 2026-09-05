-- 1) Eventos de período: end_date opcional (NULL = evento de um dia, usando event_date)
ALTER TABLE public.rotina_events
  ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.rotina_events SET end_date = event_date WHERE end_date IS NULL;

ALTER TABLE public.rotina_events
  ADD CONSTRAINT rotina_events_period_valid
  CHECK (end_date IS NULL OR end_date >= event_date);

CREATE INDEX IF NOT EXISTS rotina_events_range_idx
  ON public.rotina_events (user_id, event_date, end_date);

-- 2) Conexões explícitas do módulo central de Objetivos
ALTER TABLE public.obj_objectives
  ADD COLUMN IF NOT EXISTS linked_goal_id uuid REFERENCES public.fin_goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_habit_id uuid REFERENCES public.rotina_habits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS obj_objectives_linked_goal_idx
  ON public.obj_objectives (linked_goal_id) WHERE linked_goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS obj_objectives_linked_habit_idx
  ON public.obj_objectives (linked_habit_id) WHERE linked_habit_id IS NOT NULL;