CREATE OR REPLACE FUNCTION public.fin_transactions_guard_reversal_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND
    (OLD.reversal_of_transaction_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.fin_transactions WHERE reversal_of_transaction_id = OLD.id
    )) AND (
      NEW.description IS DISTINCT FROM OLD.description
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.recurrence IS DISTINCT FROM OLD.recurrence
    ) THEN
    RAISE EXCEPTION 'Pagamento estornado e seu estorno devem permanecer no histórico sem edição' USING ERRCODE = 'PT423';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.fin_transactions_guard_reversal_metadata() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fin_transactions_guard_reversal_metadata
  BEFORE UPDATE ON public.fin_transactions FOR EACH ROW
  EXECUTE FUNCTION public.fin_transactions_guard_reversal_metadata();