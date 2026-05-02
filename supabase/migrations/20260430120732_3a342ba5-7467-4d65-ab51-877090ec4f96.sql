
-- Add SoleasPay link setting (idempotent)
INSERT INTO public.app_settings(key, value)
VALUES ('soleaspay_link', '"https://soleaspay.com/qr/pay/sb.html?l=ZW4=&a=MA==&d=V2VsY29tZSB0byBwdWJodWIgcGF5bWVudCBzcGFjZSwgbWFrZSB5b3UgcGF5bWVudA==&m=dA==&c=VVNE&k=LXk4NjUxaktYMFVQYm1uWGZvLVRjZFhxXzVCM3E0ZW9BT080aUd3Y0J6ay1BUA==&s=UFVCIEhVQg==&q=QUYzNU5FRzJWWA=="'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Helper: recompute and apply seller level from total_sales using app_settings.level_thresholds
CREATE OR REPLACE FUNCTION public.recompute_seller_level(_seller uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thresholds jsonb;
  sales int;
  new_level int := 1;
  i int;
BEGIN
  SELECT value INTO thresholds FROM public.app_settings WHERE key = 'level_thresholds';
  IF thresholds IS NULL THEN thresholds := '[0,5,20,50,150,400,1000]'::jsonb; END IF;

  SELECT total_sales INTO sales FROM public.profiles WHERE id = _seller;
  IF sales IS NULL THEN RETURN 1; END IF;

  FOR i IN 0..(jsonb_array_length(thresholds)-1) LOOP
    IF sales >= (thresholds->>i)::int THEN
      new_level := i + 1;
    END IF;
  END LOOP;

  UPDATE public.profiles SET level = new_level WHERE id = _seller;
  RETURN new_level;
END $$;

-- Confirm order: credits seller 85%, pays referral commissions, releases delivery link
CREATE OR REPLACE FUNCTION public.admin_confirm_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  prod record;
  comm_pct numeric;
  ref_first_pct numeric;
  ref_rec_pct numeric;
  seller_amount numeric;
  seller_new_balance numeric;
  inviter uuid;
  is_first_sale boolean;
  ref_pct_used numeric;
  ref_amount numeric;
  inv_new_balance numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'confirmed' THEN RAISE EXCEPTION 'Already confirmed'; END IF;

  SELECT * INTO prod FROM public.products WHERE id = o.product_id;
  IF prod IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;

  SELECT (value)::text::numeric INTO comm_pct FROM public.app_settings WHERE key='seller_commission_pct';
  IF comm_pct IS NULL THEN comm_pct := 85; END IF;
  SELECT (value)::text::numeric INTO ref_first_pct FROM public.app_settings WHERE key='referral_first_pct';
  IF ref_first_pct IS NULL THEN ref_first_pct := 5; END IF;
  SELECT (value)::text::numeric INTO ref_rec_pct FROM public.app_settings WHERE key='referral_recurring_pct';
  IF ref_rec_pct IS NULL THEN ref_rec_pct := 1; END IF;

  seller_amount := round(o.amount * comm_pct / 100, 2);

  -- Credit seller
  UPDATE public.profiles
    SET balance = balance + seller_amount,
        total_sales = total_sales + 1
    WHERE id = o.seller_id
    RETURNING balance INTO seller_new_balance;

  INSERT INTO public.ledger(user_id, kind, amount, balance_after, related_order_id, related_user_id, created_by, note)
  VALUES (o.seller_id, 'sale_credit', seller_amount, seller_new_balance, o.id, o.buyer_id, auth.uid(),
          format('Sale of %s (order %s)', prod.title, o.order_number));

  -- Recompute seller level
  PERFORM public.recompute_seller_level(o.seller_id);

  -- Confirm order + release delivery link
  UPDATE public.orders
    SET status = 'confirmed',
        confirmed_at = now(),
        confirmed_by = auth.uid(),
        delivered_link = prod.delivery_link,
        updated_at = now()
    WHERE id = o.id;

  -- Bump product sales/score
  UPDATE public.products
    SET sales_count = sales_count + 1,
        trending_score = (sales_count + 1) * 0.6 + COALESCE(rating_avg,0) * 0.2
                          + (1.0 / (1 + EXTRACT(EPOCH FROM (now() - created_at))/86400.0)) * 0.2
    WHERE id = prod.id;

  -- Referral payout (if buyer was referred)
  IF o.buyer_id IS NOT NULL THEN
    SELECT referred_by INTO inviter FROM public.profiles WHERE id = o.buyer_id;
    IF inviter IS NOT NULL THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM public.referral_earnings WHERE invitee_id = o.buyer_id
      ) INTO is_first_sale;

      IF is_first_sale THEN ref_pct_used := ref_first_pct; ELSE ref_pct_used := ref_rec_pct; END IF;
      ref_amount := round(o.amount * ref_pct_used / 100, 2);

      IF ref_amount > 0 THEN
        UPDATE public.profiles SET balance = balance + ref_amount
          WHERE id = inviter RETURNING balance INTO inv_new_balance;

        INSERT INTO public.referral_earnings(inviter_id, invitee_id, order_id, amount, is_first_sale)
        VALUES (inviter, o.buyer_id, o.id, ref_amount, is_first_sale);

        INSERT INTO public.ledger(user_id, kind, amount, balance_after, related_order_id, related_user_id, created_by, note)
        VALUES (inviter,
                CASE WHEN is_first_sale THEN 'referral_first'::ledger_kind ELSE 'referral_recurring'::ledger_kind END,
                ref_amount, inv_new_balance, o.id, o.buyer_id, auth.uid(),
                format('Referral %s%% on order %s', ref_pct_used, o.order_number));

        INSERT INTO public.notifications(kind, is_public, target_user_id, title, body, created_by)
        VALUES ('system', false, inviter, 'Referral earnings', format('You earned %s F CFA from a referral!', ref_amount), auth.uid());
      END IF;
    END IF;

    -- Notify buyer
    INSERT INTO public.notifications(kind, is_public, target_user_id, title, body, created_by)
    VALUES ('system', false, o.buyer_id, 'Your order is ready 🎉',
            format('Order %s confirmed. Access your product in My Orders.', o.order_number), auth.uid());
  END IF;

  -- Audit
  INSERT INTO public.audit_log(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'confirm_order', 'order', o.id::text,
          jsonb_build_object('amount', o.amount, 'seller_credited', seller_amount));

  RETURN jsonb_build_object('ok', true, 'seller_credited', seller_amount, 'order_id', o.id);
END $$;

-- Reject order
CREATE OR REPLACE FUNCTION public.admin_reject_order(_order_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'confirmed' THEN RAISE EXCEPTION 'Cannot reject a confirmed order'; END IF;

  UPDATE public.orders
    SET status = 'rejected', admin_note = _reason, updated_at = now(), confirmed_by = auth.uid()
    WHERE id = o.id;

  IF o.buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications(kind, is_public, target_user_id, title, body, created_by)
    VALUES ('system', false, o.buyer_id, 'Order rejected',
            format('Order %s was rejected. Reason: %s', o.order_number, _reason), auth.uid());
  END IF;

  INSERT INTO public.audit_log(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'reject_order', 'order', o.id::text, jsonb_build_object('reason', _reason));

  RETURN jsonb_build_object('ok', true);
END $$;

-- Admin balance adjustment
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user uuid, _amount numeric, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_bal numeric; kind ledger_kind;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.profiles SET balance = balance + _amount WHERE id = _user RETURNING balance INTO new_bal;
  IF new_bal IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  kind := CASE WHEN _amount >= 0 THEN 'admin_credit'::ledger_kind ELSE 'admin_debit'::ledger_kind END;

  INSERT INTO public.ledger(user_id, kind, amount, balance_after, created_by, note)
  VALUES (_user, kind, _amount, new_bal, auth.uid(), COALESCE(_note,'Admin adjustment'));

  INSERT INTO public.audit_log(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'adjust_balance', 'user', _user::text, jsonb_build_object('amount', _amount, 'note', _note));

  RETURN jsonb_build_object('ok', true, 'balance', new_bal);
END $$;

-- Admin set product status
CREATE OR REPLACE FUNCTION public.admin_set_product_status(_product uuid, _status product_status, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.products SET status = _status, rejection_reason = _reason, updated_at = now() WHERE id = _product;
  INSERT INTO public.audit_log(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_product_status', 'product', _product::text, jsonb_build_object('status', _status, 'reason', _reason));
  RETURN jsonb_build_object('ok', true);
END $$;

-- Admin set user level / status
CREATE OR REPLACE FUNCTION public.admin_set_user(_user uuid, _level int DEFAULT NULL, _status account_status DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.profiles SET
    level = COALESCE(_level, level),
    status = COALESCE(_status, status),
    updated_at = now()
  WHERE id = _user;
  INSERT INTO public.audit_log(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_user', 'user', _user::text, jsonb_build_object('level', _level, 'status', _status));
  RETURN jsonb_build_object('ok', true);
END $$;

-- Trigger to attach handle_new_user (in case missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
