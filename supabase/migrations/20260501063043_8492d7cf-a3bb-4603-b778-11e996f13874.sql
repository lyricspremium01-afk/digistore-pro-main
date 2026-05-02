
-- 1. Add missing 'debit' value to ledger_kind enum
ALTER TYPE public.ledger_kind ADD VALUE IF NOT EXISTS 'debit';

-- 2. Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  description TEXT,
  profile_image_url TEXT,
  store_link TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores read all" ON public.stores FOR SELECT USING (true);
CREATE POLICY "stores owner update" ON public.stores FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "stores admin all" ON public.stores FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Function to auto-create store after 3 approved products
CREATE OR REPLACE FUNCTION public.auto_create_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INT;
  _name TEXT;
  _slug TEXT;
BEGIN
  -- Only fire when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Check if store already exists
    IF EXISTS (SELECT 1 FROM stores WHERE user_id = NEW.seller_id) THEN
      RETURN NEW;
    END IF;

    -- Count approved products
    SELECT count(*) INTO _count FROM products WHERE seller_id = NEW.seller_id AND status = 'approved';

    IF _count >= 3 THEN
      SELECT COALESCE(full_name, split_part(email, '@', 1), 'Store') INTO _name
        FROM profiles WHERE id = NEW.seller_id;

      _slug := lower(regexp_replace(_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6);

      INSERT INTO stores (user_id, store_name, store_link)
      VALUES (NEW.seller_id, _name || '''s Store', _slug)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_store
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_store();

-- 4. Fix request_withdrawal to use correct enum value
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _method text, _account_name text, _account_number text, _account_details text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
  VALUES (_uid, 'withdrawal', -_amount, _bal - _amount, _uid, 'Withdrawal requested #' || _wid);

  RETURN _wid;
END; $$;
