CREATE TYPE public.atlas_comm_style AS ENUM ('amigavel','direto','motivador','profissional','descontraido');
CREATE TYPE public.atlas_accountability AS ENUM ('leve','normal','firme');
CREATE TYPE public.atlas_theme AS ENUM ('system','light','dark');
CREATE TYPE public.atlas_density AS ENUM ('confortavel','compacta');
CREATE TYPE public.atlas_memory_category AS ENUM ('profile','preference','routine','goal','personal','other');

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  nickname text,
  avatar_url text,
  bio text,
  occupation text,
  city text,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

CREATE TABLE public.atlas_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  communication_style public.atlas_comm_style NOT NULL DEFAULT 'amigavel',
  accountability_level public.atlas_accountability NOT NULL DEFAULT 'normal',
  use_emojis boolean NOT NULL DEFAULT true,
  use_nickname boolean NOT NULL DEFAULT false,
  motivational_messages boolean NOT NULL DEFAULT true,
  smart_reminders boolean NOT NULL DEFAULT true,
  theme public.atlas_theme NOT NULL DEFAULT 'system',
  animations_enabled boolean NOT NULL DEFAULT true,
  interface_density public.atlas_density NOT NULL DEFAULT 'confortavel',
  memory_categories jsonb NOT NULL DEFAULT '{"profile":true,"goal":true,"routine":true,"habit":true,"preference":true,"personal":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_preferences TO authenticated;
GRANT ALL ON public.atlas_preferences TO service_role;
ALTER TABLE public.atlas_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_select_own" ON public.atlas_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON public.atlas_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON public.atlas_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_delete_own" ON public.atlas_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.atlas_preferences FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();

CREATE TABLE public.atlas_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  category public.atlas_memory_category NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_memories TO authenticated;
GRANT ALL ON public.atlas_memories TO service_role;
ALTER TABLE public.atlas_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mem_select_own" ON public.atlas_memories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mem_insert_own" ON public.atlas_memories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mem_update_own" ON public.atlas_memories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mem_delete_own" ON public.atlas_memories FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_memories_updated BEFORE UPDATE ON public.atlas_memories FOR EACH ROW EXECUTE FUNCTION public.rotina_touch_updated_at();
CREATE INDEX idx_atlas_memories_user ON public.atlas_memories(user_id, created_at DESC);