
-- Update updated_at helper
CREATE OR REPLACE FUNCTION public.rotina_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Priority enum
DO $$ BEGIN
  CREATE TYPE public.rotina_priority AS ENUM ('baixa','media','alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TASKS
CREATE TABLE public.rotina_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  due_time time,
  priority public.rotina_priority NOT NULL DEFAULT 'media',
  category text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_tasks TO authenticated;
GRANT ALL ON public.rotina_tasks TO service_role;
ALTER TABLE public.rotina_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks select" ON public.rotina_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.rotina_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.rotina_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.rotina_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER rotina_tasks_touch BEFORE UPDATE ON public.rotina_tasks FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
CREATE INDEX rotina_tasks_user_date_idx ON public.rotina_tasks (user_id, due_date);

-- EVENTS
CREATE TABLE public.rotina_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  color text NOT NULL DEFAULT '#6366f1',
  reminder_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_events TO authenticated;
GRANT ALL ON public.rotina_events TO service_role;
ALTER TABLE public.rotina_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events select" ON public.rotina_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.rotina_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events update" ON public.rotina_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events delete" ON public.rotina_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER rotina_events_touch BEFORE UPDATE ON public.rotina_events FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
CREATE INDEX rotina_events_user_date_idx ON public.rotina_events (user_id, event_date);

-- HABITS
CREATE TABLE public.rotina_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT '#6366f1',
  time_of_day time,
  -- days of week: 0=Sun..6=Sat, empty = every day
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[]::smallint[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_habits TO authenticated;
GRANT ALL ON public.rotina_habits TO service_role;
ALTER TABLE public.rotina_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits select" ON public.rotina_habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own habits insert" ON public.rotina_habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own habits update" ON public.rotina_habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own habits delete" ON public.rotina_habits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER rotina_habits_touch BEFORE UPDATE ON public.rotina_habits FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

-- HABIT LOGS
CREATE TABLE public.rotina_habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.rotina_habits(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_habit_logs TO authenticated;
GRANT ALL ON public.rotina_habit_logs TO service_role;
ALTER TABLE public.rotina_habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit logs select" ON public.rotina_habit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own habit logs insert" ON public.rotina_habit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own habit logs update" ON public.rotina_habit_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own habit logs delete" ON public.rotina_habit_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX rotina_habit_logs_habit_date_idx ON public.rotina_habit_logs (habit_id, log_date DESC);

-- NOTES
CREATE TABLE public.rotina_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  category text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotina_notes TO authenticated;
GRANT ALL ON public.rotina_notes TO service_role;
ALTER TABLE public.rotina_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes select" ON public.rotina_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notes insert" ON public.rotina_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes update" ON public.rotina_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes delete" ON public.rotina_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER rotina_notes_touch BEFORE UPDATE ON public.rotina_notes FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
