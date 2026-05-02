-- 1. Account-listing fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'digital',
  ADD COLUMN IF NOT EXISTS stock INTEGER,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS monetized BOOLEAN,
  ADD COLUMN IF NOT EXISTS account_age TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT,
  ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}'::jsonb;

-- 2. Seed account-selling categories (id is uuid; use slug as conflict target)
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Social Accounts', 'social-accounts', '👥', 50),
  ('Channels', 'channels', '📺', 51),
  ('Gaming Accounts', 'gaming-accounts', '🎮', 52),
  ('Files & Documents', 'files', '📁', 53),
  ('Software Licenses', 'licenses', '🔑', 54)
ON CONFLICT (slug) DO NOTHING;

-- 3. Payment methods: add 'embed' kind support (already TEXT) + embed_html column
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS embed_html TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- 4. Notifications: read tracking
CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nr self read" ON public.notification_reads FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "nr self insert" ON public.notification_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- 5. Wallet checkout RPC: instant pay, decrement stock, credit seller 85%, referral payout
CREATE OR REPLACE FUNCTION public.wallet_checkout(_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _bal NUMERIC;
  _prod RECORD;
  _order_id UUID;
  _order_no TEXT;
  _comm_pct NUMERIC;
  _ref_first NUMERIC;
  _ref_rec NUMERIC;
  _seller_amount NUMERIC;
  _seller_new_bal NUMERIC;
  _new_bal NUMERIC;
  _inviter UUID;
  _is_first BOOL;
  _ref_pct NUMERIC;
  _ref_amount NUMERIC;
  _inv_bal NUMERIC;
  _email TEXT;
  _name TEXT;
  _phone TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _prod FROM products WHERE id = _product_id FOR UPDATE;
  IF _prod IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF _prod.status <> 'approved' THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  IF _prod.seller_id = _uid THEN RAISE EXCEPTION 'Cannot buy your own product'; END IF;
  IF _prod.stock IS NOT NULL AND _prod.stock <= 0 THEN RAISE EXCEPTION 'Out of stock'; END IF;

  SELECT balance, email, full_name, phone INTO _bal, _email, _name, _phone
    FROM profiles WHERE id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _prod.price THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Deduct buyer
  UPDATE profiles SET balance = balance - _prod.price WHERE id = _uid RETURNING balance INTO _new_bal;
  INSERT INTO ledger(user_id, kind, amount, balance_after, related_user_id, note)
  VALUES (_uid, 'debit', -_prod.price, _new_bal, _prod.seller_id, 'Wallet purchase: ' || _prod.title);

  _order_no := 'DS-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO orders(order_number, product_id, seller_id, buyer_id, buyer_name, buyer_email, buyer_phone,
                     amount, currency, payment_method, status, confirmed_at, confirmed_by, delivered_link)
  VALUES (_order_no, _prod.id, _prod.seller_id, _uid, COALESCE(_name,_email), _email, COALESCE(_phone,''),
          _prod.price, _prod.currency, 'wallet', 'confirmed', now(), _uid, _prod.delivery_link)
  RETURNING id INTO _order_id;

  -- Decrement stock
  IF _prod.stock IS NOT NULL THEN
    UPDATE products SET stock = stock - 1 WHERE id = _prod.id;
  END IF;

  -- Credit seller 85%
  SELECT (value)::text::numeric INTO _comm_pct FROM app_settings WHERE key='seller_commission_pct';
  IF _comm_pct IS NULL THEN _comm_pct := 85; END IF;
  _seller_amount := round(_prod.price * _comm_pct / 100, 2);

  UPDATE profiles SET balance = balance + _seller_amount, total_sales = total_sales + 1
    WHERE id = _prod.seller_id RETURNING balance INTO _seller_new_bal;
  INSERT INTO ledger(user_id, kind, amount, balance_after, related_order_id, related_user_id, note)
  VALUES (_prod.seller_id, 'sale_credit', _seller_amount, _seller_new_bal, _order_id, _uid,
          format('Wallet sale of %s (order %s)', _prod.title, _order_no));

  PERFORM recompute_seller_level(_prod.seller_id);

  UPDATE products SET sales_count = sales_count + 1 WHERE id = _prod.id;

  -- Referral
  SELECT referral_first_pct.value::text::numeric INTO _ref_first FROM app_settings referral_first_pct WHERE key='referral_first_pct';
  IF _ref_first IS NULL THEN _ref_first := 5; END IF;
  SELECT (value)::text::numeric INTO _ref_rec FROM app_settings WHERE key='referral_recurring_pct';
  IF _ref_rec IS NULL THEN _ref_rec := 1; END IF;

  SELECT referred_by INTO _inviter FROM profiles WHERE id = _uid;
  IF _inviter IS NOT NULL THEN
    SELECT NOT EXISTS (SELECT 1 FROM referral_earnings WHERE invitee_id = _uid) INTO _is_first;
    _ref_pct := CASE WHEN _is_first THEN _ref_first ELSE _ref_rec END;
    _ref_amount := round(_prod.price * _ref_pct / 100, 2);
    IF _ref_amount > 0 THEN
      UPDATE profiles SET balance = balance + _ref_amount WHERE id = _inviter RETURNING balance INTO _inv_bal;
      INSERT INTO referral_earnings(inviter_id, invitee_id, order_id, amount, is_first_sale)
      VALUES (_inviter, _uid, _order_id, _ref_amount, _is_first);
      INSERT INTO ledger(user_id, kind, amount, balance_after, related_order_id, related_user_id, note)
      VALUES (_inviter,
              CASE WHEN _is_first THEN 'referral_first'::ledger_kind ELSE 'referral_recurring'::ledger_kind END,
              _ref_amount, _inv_bal, _order_id, _uid,
              format('Referral %s%% on order %s', _ref_pct, _order_no));
    END IF;
  END IF;

  -- Notifications
  INSERT INTO notifications(kind, is_public, target_user_id, title, body)
  VALUES ('system', false, _uid, 'Purchase complete 🎉',
          format('Order %s confirmed. Access your product in My Orders.', _order_no));
  INSERT INTO notifications(kind, is_public, target_user_id, title, body)
  VALUES ('system', false, _prod.seller_id, 'New sale 💰',
          format('You sold %s. %s credited to your balance.', _prod.title, _seller_amount));

  RETURN jsonb_build_object('ok', true, 'order_id', _order_id, 'order_number', _order_no);
END $$;