CREATE OR REPLACE FUNCTION public.update_fin_installment_plan(
  p_plan_id uuid, p_account_id uuid, p_description text, p_category text,
  p_total numeric, p_count integer, p_first_due date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.fin_installment_plans%ROWTYPE;
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_cat text := nullif(btrim(coalesce(p_category, '')), '');
  v_paid_count int; v_paid_sum numeric; v_max_paid int;
  v_open int; v_cents bigint; v_base bigint; v_rem bigint; v_k int := 0; i int;
  v_acc record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  SELECT * INTO v_plan FROM public.fin_installment_plans WHERE id = p_plan_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcelamento não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_plan.status <> 'ativo' THEN RAISE EXCEPTION 'Só parcelamentos ativos podem ser editados' USING ERRCODE = 'PT410'; END IF;
  PERFORM 1 FROM public.fin_installments WHERE plan_id = p_plan_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.fin_installments WHERE plan_id = p_plan_id AND status = 'estornada') THEN
    RAISE EXCEPTION 'Parcelamentos com pagamento estornado não podem ser editados' USING ERRCODE = 'PT422';
  END IF;
  PERFORM public.fin_validate_installment_amount(p_total, p_count);
  IF v_desc IS NULL OR length(v_desc) > 200 THEN RAISE EXCEPTION 'Descreva a compra' USING ERRCODE = '22023'; END IF;
  IF p_first_due IS NULL THEN RAISE EXCEPTION 'Data do primeiro vencimento obrigatória' USING ERRCODE = '22023'; END IF;
  IF p_account_id IS NULL THEN RAISE EXCEPTION 'Escolha a conta do parcelamento' USING ERRCODE = '22023'; END IF;
  IF p_account_id IS DISTINCT FROM v_plan.account_id THEN
    SELECT id, archived INTO v_acc FROM public.fin_accounts WHERE id = p_account_id AND user_id = v_uid FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE = 'P0002'; END IF;
    IF v_acc.archived THEN RAISE EXCEPTION 'Escolha uma conta ativa' USING ERRCODE = '22023'; END IF;
  END IF;

  SELECT count(*), coalesce(sum(amount), 0), coalesce(max(number), 0) INTO v_paid_count, v_paid_sum, v_max_paid
    FROM public.fin_installments WHERE plan_id = p_plan_id AND status = 'paga';
  IF v_paid_count > 0 THEN
    IF p_first_due IS DISTINCT FROM v_plan.first_due_date THEN
      RAISE EXCEPTION 'Com parcelas pagas, a data do primeiro vencimento não pode mudar' USING ERRCODE = 'PT422';
    END IF;
    IF p_count < v_max_paid OR p_count - v_paid_count < 1 THEN
      RAISE EXCEPTION 'A nova quantidade precisa manter as parcelas pagas e ao menos uma parcela em aberto' USING ERRCODE = 'PT422';
    END IF;
  END IF;
  v_open := p_count - v_paid_count;
  v_cents := round((p_total - v_paid_sum) * 100)::bigint;
  IF v_cents < v_open THEN
    RAISE EXCEPTION 'O novo total precisa ser maior que o já pago (% ) e cobrir as parcelas em aberto', v_paid_sum USING ERRCODE = 'PT422';
  END IF;

  DELETE FROM public.fin_installments WHERE plan_id = p_plan_id AND status = 'aberta';
  v_base := v_cents / v_open; v_rem := v_cents % v_open;
  FOR i IN 1..p_count LOOP
    IF NOT EXISTS (SELECT 1 FROM public.fin_installments WHERE plan_id = p_plan_id AND number = i) THEN
      v_k := v_k + 1;
      INSERT INTO public.fin_installments (user_id, plan_id, number, amount, due_date)
      VALUES (v_uid, p_plan_id, i, (v_base + CASE WHEN v_k <= v_rem THEN 1 ELSE 0 END)::numeric / 100,
              public.fin_installment_due_date(p_first_due, i));
    END IF;
  END LOOP;
  UPDATE public.fin_installment_plans SET account_id = p_account_id, description = v_desc, category = v_cat,
    total_amount = p_total, installment_count = p_count, first_due_date = p_first_due, updated_at = now()
  WHERE id = p_plan_id;
  RETURN jsonb_build_object('plan_id', p_plan_id);
END $function$;