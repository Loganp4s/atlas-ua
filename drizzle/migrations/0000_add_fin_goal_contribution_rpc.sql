CREATE OR REPLACE FUNCTION public.add_fin_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_contribution_date date,
  p_note text DEFAULT NULL
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

  INSERT INTO public.fin_goal_contributions (user_id, goal_id, amount, contribution_date, note)
  VALUES (v_uid, p_goal_id, p_amount, p_contribution_date, p_note)
  RETURNING id INTO v_id;

  UPDATE public.fin_goals
    SET current_amount = current_amount + p_amount
    WHERE id = p_goal_id AND user_id = v_uid
    RETURNING current_amount INTO v_total;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar a meta' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('contribution_id', v_id, 'current_amount', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text) TO authenticated, service_role;