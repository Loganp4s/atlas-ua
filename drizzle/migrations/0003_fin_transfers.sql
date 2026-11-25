CREATE TABLE public.fin_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_account_id uuid NOT NULL REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
  destination_account_id uuid NOT NULL REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  transfer_date date NOT NULL,
  description text,
  client_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id),
  CONSTRAINT fin_transfers_amount_positive CHECK (amount > 0)
);

GRANT SELECT ON public.fin_transfers TO authenticated;
GRANT ALL ON public.fin_transfers TO service_role;
ALTER TABLE public.fin_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transfers" ON public.fin_transfers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX fin_transfers_user_date_idx ON public.fin_transfers (user_id, transfer_date DESC, created_at DESC, id);
CREATE INDEX fin_transfers_source_idx ON public.fin_transfers (source_account_id);
CREATE INDEX fin_transfers_destination_idx ON public.fin_transfers (destination_account_id);
CREATE UNIQUE INDEX fin_transfers_user_request_uidx ON public.fin_transfers (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_fin_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_transfer_date date,
  p_description text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_acc record;
  v_count int := 0;
  v_original public.fin_transfers%ROWTYPE;
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount <= 0 OR p_amount <> round(p_amount, 2) OR p_amount >= 1e12 THEN
    RAISE EXCEPTION 'Valor de transferência inválido' USING ERRCODE = '22023';
  END IF;
  IF p_transfer_date IS NULL THEN
    RAISE EXCEPTION 'Data da transferência obrigatória' USING ERRCODE = '22023';
  END IF;
  IF p_source_account_id IS NULL OR p_destination_account_id IS NULL THEN
    RAISE EXCEPTION 'Contas de origem e destino obrigatórias' USING ERRCODE = '22023';
  END IF;
  IF p_source_account_id = p_destination_account_id THEN
    RAISE EXCEPTION 'Origem e destino devem ser contas diferentes' USING ERRCODE = '22023';
  END IF;

  -- Lock both accounts in a consistent order (by id) to avoid deadlocks.
  FOR v_acc IN
    SELECT id, archived, type FROM public.fin_accounts
    WHERE id IN (p_source_account_id, p_destination_account_id) AND user_id = v_uid
    ORDER BY id FOR UPDATE
  LOOP
    v_count := v_count + 1;
    IF v_acc.archived THEN
      RAISE EXCEPTION 'Contas arquivadas não aceitam novas transferências' USING ERRCODE = '22023';
    END IF;
    IF v_acc.type = 'cartao' THEN
      RAISE EXCEPTION 'Transferências com cartão ainda não são suportadas' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Conta não encontrada' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.fin_transfers
    (user_id, source_account_id, destination_account_id, amount, transfer_date, description, client_request_id)
  VALUES (v_uid, p_source_account_id, p_destination_account_id, p_amount, p_transfer_date, v_desc, p_request_id)
  ON CONFLICT (user_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT * INTO v_original FROM public.fin_transfers
      WHERE user_id = v_uid AND client_request_id = p_request_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não foi possível confirmar a transferência. Repita a mesma tentativa.' USING ERRCODE = '40001';
    END IF;
    IF v_original.source_account_id IS DISTINCT FROM p_source_account_id
       OR v_original.destination_account_id IS DISTINCT FROM p_destination_account_id
       OR v_original.amount IS DISTINCT FROM p_amount
       OR v_original.transfer_date IS DISTINCT FROM p_transfer_date
       OR v_original.description IS DISTINCT FROM v_desc THEN
      RAISE EXCEPTION 'Conflito: este código já pertence a outra transferência. Nada foi registrado.' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object('transfer_id', v_original.id, 'duplicate', true);
  END IF;

  RETURN jsonb_build_object('transfer_id', v_id, 'duplicate', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_fin_transfer(uuid, uuid, numeric, date, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fin_transfer(uuid, uuid, numeric, date, text, uuid) TO authenticated, service_role;