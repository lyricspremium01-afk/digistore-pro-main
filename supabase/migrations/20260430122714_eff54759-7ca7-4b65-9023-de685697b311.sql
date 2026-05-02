CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  method TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_details TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals self read" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "withdrawals self insert" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "withdrawals admin all" ON public.withdrawals
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount NUMERIC, _method TEXT, _account_name TEXT,
  _account_number TEXT, _account_details TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _bal NUMERIC;
  _wid UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  SELECT balance INTO _bal FROM profiles WHERE id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE profiles SET balance = balance - _amount WHERE id = _uid;

  INSERT INTO withdrawals (user_id, amount, method, account_name, account_number, account_details)
  VALUES (_uid, _amount, _method, _account_name, _account_number, _account_details)
  RETURNING id INTO _wid;

  INSERT INTO ledger (user_id, kind, amount, balance_after, related_user_id, note)
  VALUES (_uid, 'debit', -_amount, _bal - _amount, _uid, 'Withdrawal requested #' || _wid);

  RETURN _wid;
END; $$;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  _withdrawal_id UUID, _action TEXT, _note TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _w withdrawals%ROWTYPE;
  _bal NUMERIC;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _w FROM withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF _w.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;

  IF _action = 'approve' THEN
    UPDATE withdrawals SET status = 'approved', admin_note = _note,
      processed_by = auth.uid(), processed_at = now() WHERE id = _withdrawal_id;
  ELSIF _action = 'paid' THEN
    UPDATE withdrawals SET status = 'paid', admin_note = _note,
      processed_by = auth.uid(), processed_at = now() WHERE id = _withdrawal_id;
  ELSIF _action = 'reject' THEN
    IF _w.status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;
    SELECT balance INTO _bal FROM profiles WHERE id = _w.user_id FOR UPDATE;
    UPDATE profiles SET balance = balance + _w.amount WHERE id = _w.user_id;
    INSERT INTO ledger (user_id, kind, amount, balance_after, related_user_id, note, created_by)
    VALUES (_w.user_id, 'credit', _w.amount, COALESCE(_bal,0) + _w.amount, _w.user_id,
            'Withdrawal rejected refund #' || _w.id, auth.uid());
    UPDATE withdrawals SET status = 'rejected', admin_note = _note,
      processed_by = auth.uid(), processed_at = now() WHERE id = _withdrawal_id;
  ELSE
    RAISE EXCEPTION 'Invalid action';
  END IF;

  INSERT INTO audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'withdrawal_' || _action, 'withdrawal', _withdrawal_id::text,
          jsonb_build_object('note', _note));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(UUID, TEXT, TEXT) TO authenticated;