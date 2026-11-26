CREATE OR REPLACE FUNCTION public.pay_fin_installment(
  p_installment_id uuid, p_account_id uuid, p_paid_date date, p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inst public.fin_installments%ROWTYPE;
  v_plan public.fin_installment_plans%ROWTYPE;
  v_acc record;
  v_tx uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Código da operação obrigatório' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':pay:' || p_request_id::text, 0));
  SELECT * INTO v_inst FROM public.fin_installments WHERE user_id = v_uid AND pay_request_id = p_request_id;
  IF FOUND THEN
    IF v_inst.id IS DISTINCT FROM p_installment_id OR v_inst.paid_account_id IS DISTINCT FROM p_account_id
       OR v_inst.paid_at IS DISTINCT FROM p_paid_date THEN
      RAISE EXCEPTION 'Conflito: este código já pertence a outro pagamento. Nada foi registrado.' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('transaction_id', v_inst.transaction_id, 'duplicate', true);
  END IF;

  -- Lock order: plan, then installment (same as edit/cancel).
  SELECT p.* INTO v_plan FROM public.fin_installment_plans p
    JOIN public.fin_installments i ON i.plan_id = p.id
    WHERE i.id = p_installment_id AND i.user_id = v_uid AND p.user_id = v_uid FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_inst FROM public.fin_installments WHERE id = p_installment_id AND user_id = v_uid FOR UPDATE;
  IF v_inst.status = 'paga' THEN RAISE EXCEPTION 'Esta parcela já foi paga. Nada foi registrado.' USING ERRCODE = 'PT410'; END IF;
  IF v_inst.status = 'cancelada' THEN RAISE EXCEPTION 'Parcela cancelada não pode ser paga' USING ERRCODE = 'PT410'; END IF;
  IF p_paid_date IS NULL OR p_paid_date > current_date THEN
    RAISE EXCEPTION 'Informe a data em que o pagamento aconteceu (não pode ser futura)' USING ERRCODE = '22023';
  END IF;
  IF p_account_id IS NULL THEN RAISE EXCEPTION 'Escolha a conta do pagamento' USING ERRCODE = '22023'; END IF;
  SELECT id, archived INTO v_acc FROM public.fin_accounts WHERE id = p_account_id AND user_id = v_uid FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_acc.archived THEN RAISE EXCEPTION 'Contas arquivadas não aceitam pagamentos. Escolha uma conta ativa.' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.fin_transactions
    (user_id, account_id, type, amount, category, tx_date, description, recurrence,
     installment_group, installment_index, installment_total)
  VALUES (v_uid, p_account_id, 'saida', v_inst.amount, v_plan.category, p_paid_date,
     v_plan.description || ' (' || v_inst.number || '/' || v_plan.installment_count || ')', 'none',
     v_plan.id, v_inst.number, v_plan.installment_count)
  RETURNING id INTO v_tx;

  UPDATE public.fin_installments SET status = 'paga', paid_at = p_paid_date, paid_account_id = p_account_id,
    transaction_id = v_tx, pay_request_id = p_request_id, updated_at = now()
  WHERE id = v_inst.id;
  IF NOT EXISTS (SELECT 1 FROM public.fin_installments WHERE plan_id = v_plan.id AND status = 'aberta') THEN
    UPDATE public.fin_installment_plans SET status = 'concluido', updated_at = now()
      WHERE id = v_plan.id AND status = 'ativo';
  END IF;
  RETURN jsonb_build_object('transaction_id', v_tx, 'duplicate', false);
END $function$;