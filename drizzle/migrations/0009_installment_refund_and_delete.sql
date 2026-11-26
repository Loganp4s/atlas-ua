ALTER TABLE public.fin_transactions ADD COLUMN reversal_of_transaction_id uuid;
ALTER TABLE public.fin_transactions ADD CONSTRAINT fin_transactions_reversal_key UNIQUE (reversal_of_transaction_id);
ALTER TABLE public.fin_transactions ADD CONSTRAINT fin_transactions_reversal_fk
  FOREIGN KEY (reversal_of_transaction_id, user_id) REFERENCES public.fin_transactions(id, user_id);
COMMENT ON COLUMN public.fin_transactions.reversal_of_transaction_id IS 'Estorno de pagamento de parcela: aponta para a saída original. Escrito só por refund_fin_installment.';

ALTER TABLE public.fin_installments ADD COLUMN refund_transaction_id uuid;
ALTER TABLE public.fin_installments ADD COLUMN refund_request_id uuid;
ALTER TABLE public.fin_installments ADD COLUMN refunded_on date;
ALTER TABLE public.fin_installments ADD COLUMN refunded_at timestamptz;
ALTER TABLE public.fin_installments ADD CONSTRAINT fin_installments_refund_tx_fk
  FOREIGN KEY (refund_transaction_id, user_id) REFERENCES public.fin_transactions(id, user_id) ON DELETE RESTRICT;
ALTER TABLE public.fin_installments ADD CONSTRAINT fin_installments_refund_tx_key UNIQUE (refund_transaction_id);
ALTER TABLE public.fin_installments ADD CONSTRAINT fin_installments_refund_request_key UNIQUE (user_id, refund_request_id);
ALTER TABLE public.fin_installments DROP CONSTRAINT fin_installments_status_check;
ALTER TABLE public.fin_installments ADD CONSTRAINT fin_installments_status_check
  CHECK (status IN ('aberta','paga','cancelada','estornada'));
ALTER TABLE public.fin_installments DROP CONSTRAINT fin_installments_paid_consistency;
ALTER TABLE public.fin_installments ADD CONSTRAINT fin_installments_paid_consistency CHECK (
  (status = 'paga' AND paid_at IS NOT NULL AND transaction_id IS NOT NULL AND pay_request_id IS NOT NULL
     AND refund_transaction_id IS NULL AND refund_request_id IS NULL)
  OR (status = 'estornada' AND paid_at IS NOT NULL AND transaction_id IS NOT NULL AND pay_request_id IS NOT NULL
     AND refund_transaction_id IS NOT NULL AND refund_request_id IS NOT NULL AND refunded_on IS NOT NULL)
  OR (status IN ('aberta','cancelada') AND paid_at IS NULL AND transaction_id IS NULL AND refund_transaction_id IS NULL));

-- Pagamento: só parcelas em aberto (estornadas não podem ser pagas de novo).
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

  SELECT p.* INTO v_plan FROM public.fin_installment_plans p
    JOIN public.fin_installments i ON i.plan_id = p.id
    WHERE i.id = p_installment_id AND i.user_id = v_uid AND p.user_id = v_uid FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_inst FROM public.fin_installments WHERE id = p_installment_id AND user_id = v_uid FOR UPDATE;
  IF v_inst.status = 'paga' THEN RAISE EXCEPTION 'Esta parcela já foi paga. Nada foi registrado.' USING ERRCODE = 'PT410'; END IF;
  IF v_inst.status = 'estornada' THEN RAISE EXCEPTION 'Parcela estornada não pode ser paga de novo' USING ERRCODE = 'PT410'; END IF;
  IF v_inst.status <> 'aberta' THEN RAISE EXCEPTION 'Parcela cancelada não pode ser paga' USING ERRCODE = 'PT410'; END IF;
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

CREATE OR REPLACE FUNCTION public.refund_fin_installment(
  p_installment_id uuid, p_refund_date date, p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inst public.fin_installments%ROWTYPE;
  v_plan public.fin_installment_plans%ROWTYPE;
  v_date date := coalesce(p_refund_date, current_date);
  v_tx uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Código da operação obrigatório' USING ERRCODE = '22023'; END IF;
  IF v_date NOT BETWEEN current_date - 1 AND current_date + 1 THEN v_date := current_date; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':refund:' || p_request_id::text, 0));
  SELECT * INTO v_inst FROM public.fin_installments WHERE user_id = v_uid AND refund_request_id = p_request_id;
  IF FOUND THEN
    IF v_inst.id IS DISTINCT FROM p_installment_id THEN
      RAISE EXCEPTION 'Conflito: este código já pertence a outro estorno. Nada foi registrado.' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('transaction_id', v_inst.refund_transaction_id, 'duplicate', true);
  END IF;

  SELECT p.* INTO v_plan FROM public.fin_installment_plans p
    JOIN public.fin_installments i ON i.plan_id = p.id
    WHERE i.id = p_installment_id AND i.user_id = v_uid AND p.user_id = v_uid FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_inst FROM public.fin_installments WHERE id = p_installment_id AND user_id = v_uid FOR UPDATE;
  IF v_inst.status = 'estornada' THEN RAISE EXCEPTION 'Este pagamento já foi estornado. Nada foi registrado.' USING ERRCODE = 'PT410'; END IF;
  IF v_inst.status <> 'paga' THEN RAISE EXCEPTION 'Só parcelas pagas podem ser estornadas' USING ERRCODE = 'PT410'; END IF;
  IF v_inst.paid_account_id IS NULL THEN
    RAISE EXCEPTION 'A conta usada no pagamento foi removida; não é possível estornar' USING ERRCODE = '22023';
  END IF;
  IF v_date < v_inst.paid_at THEN v_date := v_inst.paid_at; END IF;

  PERFORM set_config('atlas.installment_reversal', 'on', true);
  INSERT INTO public.fin_transactions
    (user_id, account_id, type, amount, category, tx_date, description, recurrence, reversal_of_transaction_id)
  VALUES (v_uid, v_inst.paid_account_id, 'entrada', v_inst.amount, v_plan.category, v_date,
     'Estorno: ' || v_plan.description || ' (' || v_inst.number || '/' || v_plan.installment_count || ')', 'none',
     v_inst.transaction_id)
  RETURNING id INTO v_tx;
  PERFORM set_config('atlas.installment_reversal', 'off', true);

  UPDATE public.fin_installments SET status = 'estornada', refund_transaction_id = v_tx,
    refund_request_id = p_request_id, refunded_on = v_date, refunded_at = now(), updated_at = now()
  WHERE id = v_inst.id;
  RETURN jsonb_build_object('transaction_id', v_tx, 'duplicate', false);
END $function$;

CREATE OR REPLACE FUNCTION public.delete_fin_installment_plan(p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_paid int; v_refunded int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  PERFORM 1 FROM public.fin_installment_plans WHERE id = p_plan_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcelamento não encontrado' USING ERRCODE = 'P0002'; END IF;
  PERFORM 1 FROM public.fin_installments WHERE plan_id = p_plan_id FOR UPDATE;
  SELECT count(*) FILTER (WHERE status = 'paga'), count(*) FILTER (WHERE status = 'estornada')
    INTO v_paid, v_refunded FROM public.fin_installments WHERE plan_id = p_plan_id;
  IF v_paid > 0 THEN
    RAISE EXCEPTION 'Há % parcela(s) paga(s). Estorne os pagamentos antes de excluir o parcelamento.', v_paid USING ERRCODE = 'PT423';
  END IF;
  DELETE FROM public.fin_installments WHERE plan_id = p_plan_id AND user_id = v_uid;
  DELETE FROM public.fin_installment_plans WHERE id = p_plan_id AND user_id = v_uid;
  RETURN jsonb_build_object('deleted', true, 'refunded_kept', v_refunded);
END $function$;

-- Pagamentos de parcela e pares pagamento/estorno só mudam pelas RPCs.
CREATE OR REPLACE FUNCTION public.fin_transactions_guard_installment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reversal_of_transaction_id IS NOT NULL
       AND coalesce(current_setting('atlas.installment_reversal', true), 'off') <> 'on' THEN
      RAISE EXCEPTION 'Estornos só podem ser registrados pelo parcelamento' USING ERRCODE = 'PT423';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.fin_installments WHERE transaction_id = OLD.id OR refund_transaction_id = OLD.id)
     OR (auth.uid() IS NOT NULL AND (OLD.reversal_of_transaction_id IS NOT NULL
         OR EXISTS (SELECT 1 FROM public.fin_transactions WHERE reversal_of_transaction_id = OLD.id))) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Este pagamento pertence a um parcelamento e não pode ser excluído' USING ERRCODE = 'PT423';
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.tx_date IS DISTINCT FROM OLD.tx_date OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.installment_group IS DISTINCT FROM OLD.installment_group
       OR NEW.installment_index IS DISTINCT FROM OLD.installment_index
       OR NEW.installment_total IS DISTINCT FROM OLD.installment_total
       OR NEW.reversal_of_transaction_id IS DISTINCT FROM OLD.reversal_of_transaction_id
       OR (NEW.account_id IS DISTINCT FROM OLD.account_id AND NEW.account_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Este pagamento pertence a um parcelamento; gerencie-o pelo parcelamento' USING ERRCODE = 'PT423';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.reversal_of_transaction_id IS DISTINCT FROM OLD.reversal_of_transaction_id THEN
    RAISE EXCEPTION 'Estornos só podem ser registrados pelo parcelamento' USING ERRCODE = 'PT423';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $function$;
CREATE TRIGGER fin_transactions_guard_reversal_insert
  BEFORE INSERT ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fin_transactions_guard_installment();

REVOKE ALL ON FUNCTION public.refund_fin_installment(uuid, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_fin_installment_plan(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pay_fin_installment(uuid, uuid, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_transactions_guard_installment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_fin_installment(uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_fin_installment_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pay_fin_installment(uuid, uuid, date, uuid) TO authenticated, service_role;