-- Etapa 1.5.1: parcelamentos reais. Compromissos (parcelas) ficam separados das
-- movimentações realizadas; o pagamento cria a saída em fin_transactions.
ALTER TABLE public.fin_transactions
  ADD CONSTRAINT fin_transactions_id_user_key UNIQUE (id, user_id);

CREATE TABLE public.fin_installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 200),
  category text,
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0 AND total_amount < 1e12),
  installment_count integer NOT NULL CHECK (installment_count BETWEEN 2 AND 72),
  first_due_date date NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','cancelado')),
  client_request_id uuid NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_installment_plans_id_user_key UNIQUE (id, user_id),
  CONSTRAINT fin_installment_plans_request_key UNIQUE (user_id, client_request_id)
);

CREATE TABLE public.fin_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  number integer NOT NULL CHECK (number >= 1 AND number <= 72),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga','cancelada')),
  paid_at date,
  paid_account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  transaction_id uuid,
  pay_request_id uuid,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_installments_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES public.fin_installment_plans(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT fin_installments_tx_fk FOREIGN KEY (transaction_id, user_id)
    REFERENCES public.fin_transactions(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT fin_installments_plan_number_key UNIQUE (plan_id, number),
  CONSTRAINT fin_installments_tx_key UNIQUE (transaction_id),
  CONSTRAINT fin_installments_pay_request_key UNIQUE (user_id, pay_request_id),
  CONSTRAINT fin_installments_paid_consistency CHECK (
    (status = 'paga' AND paid_at IS NOT NULL AND transaction_id IS NOT NULL AND pay_request_id IS NOT NULL)
    OR (status <> 'paga' AND paid_at IS NULL AND transaction_id IS NULL))
);
CREATE INDEX fin_installments_user_due_idx ON public.fin_installments (user_id, due_date);
CREATE INDEX fin_installment_plans_user_idx ON public.fin_installment_plans (user_id, created_at DESC);

GRANT SELECT ON public.fin_installment_plans, public.fin_installments TO authenticated;
GRANT ALL ON public.fin_installment_plans, public.fin_installments TO service_role;
ALTER TABLE public.fin_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own installment plans readable" ON public.fin_installment_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own installments readable" ON public.fin_installments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Vencimento da parcela N: mesmo dia de referência, limitado ao fim do mês.
CREATE OR REPLACE FUNCTION public.fin_installment_due_date(p_first date, p_number integer)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $$
  SELECT (p_first + make_interval(months => p_number - 1))::date
$$;

CREATE OR REPLACE FUNCTION public.fin_validate_installment_amount(p_total numeric, p_count integer)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  IF p_total IS NULL OR p_total::text IN ('NaN','Infinity','-Infinity') OR p_total <= 0
     OR p_total <> round(p_total, 2) OR p_total >= 1e12 THEN
    RAISE EXCEPTION 'Valor total inválido' USING ERRCODE = '22023';
  END IF;
  IF p_count IS NULL OR p_count < 2 OR p_count > 72 THEN
    RAISE EXCEPTION 'Quantidade de parcelas deve ficar entre 2 e 72' USING ERRCODE = '22023';
  END IF;
  IF round(p_total * 100) < p_count THEN
    RAISE EXCEPTION 'Valor insuficiente: cada parcela precisa de pelo menos R$ 0,01' USING ERRCODE = '22023';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_fin_installment_plan(
  p_account_id uuid, p_description text, p_category text, p_total numeric,
  p_count integer, p_first_due date, p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_cat text := nullif(btrim(coalesce(p_category, '')), '');
  v_old public.fin_installment_plans%ROWTYPE;
  v_acc record;
  v_id uuid;
  v_cents bigint; v_base bigint; v_rem bigint; i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Código da operação obrigatório' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':plan:' || p_request_id::text, 0));
  SELECT * INTO v_old FROM public.fin_installment_plans WHERE user_id = v_uid AND client_request_id = p_request_id;
  IF FOUND THEN
    IF v_old.account_id IS DISTINCT FROM p_account_id OR v_old.description IS DISTINCT FROM v_desc
       OR v_old.category IS DISTINCT FROM v_cat OR v_old.total_amount IS DISTINCT FROM p_total
       OR v_old.installment_count IS DISTINCT FROM p_count OR v_old.first_due_date IS DISTINCT FROM p_first_due THEN
      RAISE EXCEPTION 'Conflito: este código já pertence a outro parcelamento. Nada foi registrado.' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('plan_id', v_old.id, 'duplicate', true);
  END IF;

  PERFORM public.fin_validate_installment_amount(p_total, p_count);
  IF v_desc IS NULL OR length(v_desc) > 200 THEN RAISE EXCEPTION 'Descreva a compra' USING ERRCODE = '22023'; END IF;
  IF p_first_due IS NULL THEN RAISE EXCEPTION 'Data do primeiro vencimento obrigatória' USING ERRCODE = '22023'; END IF;
  IF p_account_id IS NULL THEN RAISE EXCEPTION 'Escolha a conta do parcelamento' USING ERRCODE = '22023'; END IF;
  SELECT id, archived INTO v_acc FROM public.fin_accounts WHERE id = p_account_id AND user_id = v_uid FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_acc.archived THEN RAISE EXCEPTION 'Contas arquivadas não aceitam novos parcelamentos' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.fin_installment_plans
    (user_id, account_id, description, category, total_amount, installment_count, first_due_date, client_request_id)
  VALUES (v_uid, p_account_id, v_desc, v_cat, p_total, p_count, p_first_due, p_request_id)
  RETURNING id INTO v_id;

  v_cents := round(p_total * 100)::bigint; v_base := v_cents / p_count; v_rem := v_cents % p_count;
  FOR i IN 1..p_count LOOP
    INSERT INTO public.fin_installments (user_id, plan_id, number, amount, due_date)
    VALUES (v_uid, v_id, i, (v_base + CASE WHEN i <= v_rem THEN 1 ELSE 0 END)::numeric / 100,
            public.fin_installment_due_date(p_first_due, i));
  END LOOP;
  RETURN jsonb_build_object('plan_id', v_id, 'duplicate', false);
END $function$;

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
  IF p_paid_date IS NULL OR p_paid_date > current_date + 1 THEN
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

  -- Only unpaid previsions are replaced; paid installments stay untouched.
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

CREATE OR REPLACE FUNCTION public.cancel_fin_installment_plan(
  p_plan_id uuid, p_confirm_overdue boolean, p_today date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.fin_installment_plans%ROWTYPE;
  v_today date := coalesce(p_today, current_date);
  v_overdue int; v_n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000'; END IF;
  IF v_today NOT BETWEEN current_date - 1 AND current_date + 1 THEN v_today := current_date; END IF;
  SELECT * INTO v_plan FROM public.fin_installment_plans WHERE id = p_plan_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcelamento não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_plan.status = 'cancelado' THEN RETURN jsonb_build_object('cancelled', 0, 'duplicate', true); END IF;
  IF v_plan.status = 'concluido' THEN RAISE EXCEPTION 'Parcelamento já concluído; nada a cancelar' USING ERRCODE = 'PT410'; END IF;
  SELECT count(*) INTO v_overdue FROM public.fin_installments
    WHERE plan_id = p_plan_id AND status = 'aberta' AND due_date <= v_today;
  IF v_overdue > 0 AND NOT coalesce(p_confirm_overdue, false) THEN
    RAISE EXCEPTION 'Há % parcela(s) vencida(s) sem pagamento. Confirme explicitamente o cancelamento delas.', v_overdue USING ERRCODE = 'PT428';
  END IF;
  UPDATE public.fin_installments SET status = 'cancelada', cancelled_at = now(), updated_at = now()
    WHERE plan_id = p_plan_id AND status = 'aberta';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE public.fin_installment_plans SET status = 'cancelado', cancelled_at = now(), updated_at = now() WHERE id = p_plan_id;
  RETURN jsonb_build_object('cancelled', v_n, 'duplicate', false);
END $function$;

-- Movimentações geradas por pagamento de parcela só mudam pelo parcelamento.
CREATE OR REPLACE FUNCTION public.fin_transactions_guard_installment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fin_installments WHERE transaction_id = OLD.id) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Este pagamento pertence a um parcelamento e não pode ser excluído' USING ERRCODE = 'PT423';
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.tx_date IS DISTINCT FROM OLD.tx_date OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.installment_group IS DISTINCT FROM OLD.installment_group
       OR NEW.installment_index IS DISTINCT FROM OLD.installment_index
       OR NEW.installment_total IS DISTINCT FROM OLD.installment_total
       OR (NEW.account_id IS DISTINCT FROM OLD.account_id AND NEW.account_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Este pagamento pertence a um parcelamento; gerencie-o pelo parcelamento' USING ERRCODE = 'PT423';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $function$;
CREATE TRIGGER fin_transactions_guard_installment
  BEFORE UPDATE OR DELETE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fin_transactions_guard_installment();

REVOKE ALL ON FUNCTION public.create_fin_installment_plan(uuid, text, text, numeric, integer, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pay_fin_installment(uuid, uuid, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_fin_installment_plan(uuid, uuid, text, text, numeric, integer, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_fin_installment_plan(uuid, boolean, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fin_transactions_guard_installment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_fin_installment_plan(uuid, text, text, numeric, integer, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pay_fin_installment(uuid, uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_fin_installment_plan(uuid, uuid, text, text, numeric, integer, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_fin_installment_plan(uuid, boolean, date) TO authenticated, service_role;

COMMENT ON COLUMN public.fin_transactions.installment_total IS 'Preenchido apenas em pagamentos de parcelas (pay_fin_installment) e em registros legados anteriores à etapa 1.5.1; o parcelamento vive em fin_installment_plans/fin_installments.';