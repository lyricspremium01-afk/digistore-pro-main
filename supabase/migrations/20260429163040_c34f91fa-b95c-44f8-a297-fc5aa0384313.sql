
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('user', 'seller', 'admin', 'super_admin');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'frozen');
CREATE TYPE public.product_status AS ENUM ('pending', 'approved', 'rejected', 'paused');
CREATE TYPE public.order_status AS ENUM ('awaiting_proof', 'pending_review', 'confirmed', 'rejected', 'refunded');
CREATE TYPE public.ledger_kind AS ENUM ('sale_credit', 'referral_first', 'referral_recurring', 'admin_credit', 'admin_debit', 'withdrawal');
CREATE TYPE public.notification_kind AS ENUM ('promo', 'update', 'maintenance', 'system');

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id),
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_sales INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  status account_status NOT NULL DEFAULT 'active',
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'XAF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- referral code generator
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE code TEXT;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END $$;

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref_code TEXT;
  inviter UUID;
BEGIN
  -- find inviter from metadata
  IF NEW.raw_user_meta_data ? 'ref' THEN
    SELECT id INTO inviter FROM public.profiles WHERE referral_code = upper(NEW.raw_user_meta_data->>'ref');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone',
    public.gen_referral_code(),
    inviter
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF lower(NEW.email) = 'honestansah@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories read all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('finance','Finance','💰',1),
  ('marketing','Marketing','📈',2),
  ('social-media','Social Media','📱',3),
  ('design','Design','🎨',4),
  ('coding','Coding','💻',5),
  ('languages','Languages','🌍',6),
  ('crypto','Crypto','₿',7),
  ('ebooks','E-books','📚',8),
  ('templates','Templates','🧩',9),
  ('other','Other','✨',10);

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  short_desc TEXT,
  description TEXT,
  what_youll_learn TEXT,
  who_its_for TEXT,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  cover_url TEXT,
  delivery_link TEXT NOT NULL,
  status product_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_hot BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  sales_count INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  trending_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- public read: approved only, hide delivery link via column-level NO (we do app-level) — for approved everyone can read
CREATE POLICY "products read approved" ON public.products FOR SELECT USING (status = 'approved' OR seller_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "products seller insert" ON public.products FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "products seller update" ON public.products FOR UPDATE TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "products admin all" ON public.products FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_trending ON public.products(trending_score DESC);
CREATE INDEX idx_products_category ON public.products(category_id);

CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media read all" ON public.product_media FOR SELECT USING (true);
CREATE POLICY "media seller write" ON public.product_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR public.is_admin(auth.uid()))));

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('DS-' || upper(substr(md5(random()::text), 1, 8))),
  buyer_id UUID REFERENCES public.profiles(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  payment_method TEXT NOT NULL DEFAULT 'soleaspay',
  proof_url TEXT,
  status order_status NOT NULL DEFAULT 'awaiting_proof',
  admin_note TEXT,
  delivered_link TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders buyer read" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "orders insert any" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL);
CREATE POLICY "orders buyer update proof" ON public.orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid() AND status IN ('awaiting_proof','pending_review')) WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ============ LEDGER ============
CREATE TABLE public.ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind ledger_kind NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  related_order_id UUID REFERENCES public.orders(id),
  related_user_id UUID REFERENCES public.profiles(id),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger self read" ON public.ledger FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ledger admin write" ON public.ledger FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews read all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews self write" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews self update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews admin all" ON public.reviews FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ REFERRAL EARNINGS (history) ============
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  is_first_sale BOOLEAN NOT NULL DEFAULT false,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref earnings self read" ON public.referral_earnings FOR SELECT TO authenticated USING (inviter_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ref earnings admin all" ON public.referral_earnings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind notification_kind NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  target_user_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read own or public" ON public.notifications FOR SELECT TO authenticated USING (is_public OR target_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "notif admin all" ON public.notifications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ MESSAGES (admin <-> user) ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages participant read" ON public.messages FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "messages participant insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "messages admin all" ON public.messages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ PAYMENT METHODS ============
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  link TEXT,
  details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm read all" ON public.payment_methods FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "pm admin all" ON public.payment_methods FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.payment_methods (name, kind, link, details, sort_order) VALUES
  ('SoleasPay','link','https://soleaspay.com/qr/pay/sb.html?l=ZW4=&a=MA==&d=V2VsY29tZSB0byBwdWJodWIgcGF5bWVudCBzcGFjZSwgbWFrZSB5b3UgcGF5bWVudA==&m=dA==&c=VVNE&k=LXk4NjUxaktYMFVQYm1uWGZvLVRjZFhxXzVCM3E0ZW9BT080aUd3Y0J6ay1BUA==&s=UFVCIEhVQg==&q=QUYzNU5FRzJWWA==','Secure payment via SoleasPay',1);

-- ============ APP SETTINGS (key-value) ============
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_settings (key, value) VALUES
  ('site_name', '"Digistore"'::jsonb),
  ('whatsapp_number', '"237651010478"'::jsonb),
  ('support_email', '"honestansah@gmail.com"'::jsonb),
  ('seller_commission_pct', '85'::jsonb),
  ('referral_first_pct', '5'::jsonb),
  ('referral_recurring_pct', '1'::jsonb),
  ('level_thresholds', '[0,5,20,50,150,400,1000]'::jsonb);

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit admin write" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars', true),
  ('product-covers','product-covers', true),
  ('product-gallery','product-gallery', true),
  ('payment-proofs','payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- public buckets: anyone can read; auth users upload to their own folder
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "auth upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'product-covers');
CREATE POLICY "auth upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "public read gallery" ON storage.objects FOR SELECT USING (bucket_id = 'product-gallery');
CREATE POLICY "auth upload gallery" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

-- payment proofs: only admin can read; buyer uploads to own folder
CREATE POLICY "auth upload proof" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "self read proof" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));
