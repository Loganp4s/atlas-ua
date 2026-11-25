ALTER TABLE public.fin_goal_contributions ADD COLUMN IF NOT EXISTS result_current_amount numeric;
COMMENT ON COLUMN public.fin_goal_contributions.result_current_amount IS 'Balance immediately after a new RPC contribution; NULL for pre-existing history. Never backfill historical balances.';
CREATE OR REPLACE FUNCTION public.add_fin_goal_contribution(
  p_goal_id uuid, p_amount numeric, p_contribution_date date,
  p_note text DEFAULT NULL, p_request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_total numeric;
  v_original public.fin_goal_contributions%ROWTYPE;
  v_guard text := coalesce(current_setting('atlas.goal_contribution', true), 'off');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Valor de aporte inválido' USING ERRCODE = '22023';
  END IF;
  IF p_contribution_date IS NULL THEN
    RAISE EXCEPTION 'Data do aporte obrigatória' USING ERRCODE = '22023';
  END IF;

  -- Serialize balance changes, including different request keys for one goal.
  SELECT current_amount INTO v_total FROM public.fin_goals
    WHERE id = p_goal_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Only the request-key index is handled. Any other constraint failure propagates.
  INSERT INTO public.fin_goal_contributions
    (user_id, goal_id, amount, contribution_date, note, client_request_id)
  VALUES (v_uid, p_goal_id, p_amount, p_contribution_date, p_note, p_request_id)
  ON CONFLICT (user_id, client_request_id) WHERE client_request_id IS NOT NULL
    DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- New READ COMMITTED statement snapshot sees the conflicting committed row.
    SELECT * INTO v_original FROM public.fin_goal_contributions
      WHERE user_id = v_uid AND client_request_id = p_request_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não foi possível confirmar o aporte. Repita a mesma tentativa.'
        USING ERRCODE = '40001';
    END IF;
    IF v_original.goal_id IS DISTINCT FROM p_goal_id
       OR v_original.amount IS DISTINCT FROM p_amount
       OR v_original.contribution_date IS DISTINCT FROM p_contribution_date
       OR v_original.note IS DISTINCT FROM p_note THEN
      RAISE EXCEPTION 'Conflito: este código já pertence a outro aporte. Nenhum novo valor foi registrado.'
        USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('contribution_id', v_original.id,
      'current_amount', coalesce(v_original.result_current_amount, v_total),
      'duplicate', true);
  END IF;

  PERFORM set_config('atlas.goal_contribution', 'on', true);
  UPDATE public.fin_goals SET current_amount = current_amount + p_amount
    WHERE id = p_goal_id AND user_id = v_uid RETURNING current_amount INTO v_total;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar a meta' USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('atlas.goal_contribution', v_guard, true);
  UPDATE public.fin_goal_contributions SET result_current_amount = v_total
    WHERE id = v_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao confirmar o histórico' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('contribution_id', v_id, 'current_amount', v_total, 'duplicate', false);
END;
$$;
REVOKE ALL ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_fin_goal_contribution(uuid, numeric, date, text, uuid) TO authenticated, service_role;