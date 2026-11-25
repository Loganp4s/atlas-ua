ALTER TABLE public.fin_goal_contributions ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS fin_goal_contributions_user_request_uidx
  ON public.fin_goal_contributions (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.add_fin_goal_contribution(uuid, numeric, date, text);

CREATE OR REPLACE FUNCTION public.add_fin_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_contribution_date date,
  p_note text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_total numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Valor de aporte inválido' USING ERRCODE = '22023';
  END IF;
  IF p_contribution_date IS NULL THEN
    RAISE EXCEPTION 'Data do aporte obrigatória' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.fin_goals
    WHERE id = p_goal_id AND user_id = v_uid
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.fin_goal_contributions
      WHERE user_id = v_uid AND client_request_id = p_request_id;
    IF FOUND THEN
      SELECT current_amount INTO v_total FROM public.fin_goals WHERE id = p_goal_id;
      RETURN jsonb_build_object('contribution_id', v_id, 'current_amount', v_total, 'duplicate', true);
    END IF;
  END IF;

  INSERT INTO public.fin_goal_contributions (user_id, goal_id, amount, contribution_date, note, client_request_id)
  VALUES (v_uid, p_goal_id, p_amount, p_contribution_date, p_note, p_request_id)
  RETURNING id INTO v_id;

  PERFORM set_config('atlas.goal_contribution', 'on', true);
  UPDATE public.fin_goals
    SET current_amount = current_amount + p_amount
    WHERE id = p_goal_id AND user_id = v_uid
    RETURNING current_amount INTO v_total;
  PERFORM set_config('atlas.goal_contribution', 'off', true);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar a meta' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('contribution_id', v_id, 'current_amount', v_total, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fin_goals_guard_current_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.current_amount IS DISTINCT FROM OLD.current_amount
     AND coalesce(current_setting('atlas.goal_contribution', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'O valor guardado só muda por aportes' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fin_goals_guard_current_amount ON public.fin_goals;
CREATE TRIGGER fin_goals_guard_current_amount
  BEFORE UPDATE OF current_amount ON public.fin_goals
  FOR EACH ROW EXECUTE FUNCTION public.fin_goals_guard_current_amount();