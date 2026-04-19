-- HomeEase — core schema, RLS, and in-app notifications
-- Run with: supabase db push   OR paste into Supabase SQL Editor (single transaction).

-- ---------------------------------------------------------------------------
-- 1) Types
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('customer', 'provider', 'admin');

CREATE TYPE public.provider_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'customer',
  provider_status public.provider_status NULL,
  experience_years int NULL,
  primary_category_id uuid NULL REFERENCES public.categories (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_provider_status_ck CHECK (
    (
      role = 'provider'
      AND provider_status IS NOT NULL
    )
    OR (
      role <> 'provider'
      AND provider_status IS NULL
    )
  )
);

CREATE INDEX idx_profiles_role ON public.profiles (role);

CREATE INDEX idx_profiles_provider_status ON public.profiles (provider_status)
WHERE
  role = 'provider';

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  provider_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  fee_cents int NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  duration_text text,
  image_url text,
  includes jsonb DEFAULT '[]'::jsonb,
  addons jsonb DEFAULT '[]'::jsonb,
  warranty text,
  tag text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (provider_id, slug)
);

CREATE INDEX idx_services_category ON public.services (category_id);

CREATE INDEX idx_services_provider ON public.services (provider_id);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  duration_hours numeric,
  address text,
  notes text,
  status public.booking_status NOT NULL DEFAULT 'pending',
  total_cents int NOT NULL CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX idx_bookings_customer ON public.bookings (customer_id);

CREATE INDEX idx_bookings_provider ON public.bookings (provider_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3) Helpers (SECURITY DEFINER keeps logic in one place for RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE
      p.id = auth.uid ()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_provider ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE
      p.id = auth.uid ()
      AND p.role = 'provider'
      AND p.provider_status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) New auth user → profile row (reads role + extra fields from raw_user_meta_data)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  r text;
  ps public.provider_status;
  cat_id uuid;
  exp_years int;
BEGIN
  -- Never trust "admin" from the client; promote admins only via SQL in the dashboard.
  r := COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer');
  IF r NOT IN ('customer', 'provider') THEN
    r := 'customer';
  END IF;

  IF r = 'provider' THEN
    ps := 'pending';
  ELSE
    ps := NULL;
  END IF;

  IF (NEW.raw_user_meta_data ? 'primary_category_slug') THEN
    SELECT
      c.id INTO cat_id
    FROM
      public.categories c
    WHERE
      c.slug = NEW.raw_user_meta_data ->> 'primary_category_slug'
    LIMIT 1;
  ELSE
    cat_id := NULLIF(NEW.raw_user_meta_data ->> 'primary_category_id', '')::uuid;
  END IF;

  BEGIN
    exp_years := (NEW.raw_user_meta_data ->> 'experience_years')::int;
  EXCEPTION
    WHEN OTHERS THEN
      exp_years := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    provider_status,
    experience_years,
    primary_category_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    r::public.user_role,
    ps,
    exp_years,
    cat_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- 5) Notifications: new pending provider → notify every admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_new_provider ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  a RECORD;
BEGIN
  IF NEW.role = 'provider' AND NEW.provider_status = 'pending' THEN
    FOR a IN
    SELECT
      id
    FROM
      public.profiles
    WHERE
      role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, metadata)
      VALUES (
        a.id,
        'provider_request',
        'New provider registration',
        COALESCE(NEW.full_name, 'A provider') || ' (' || NEW.email || ') is waiting for approval.',
        jsonb_build_object('provider_id', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_notify_admins_provider
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.notify_admins_new_provider ();

-- ---------------------------------------------------------------------------
-- 6) Notifications: new booking → notify assigned provider
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_provider_new_booking ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  svc_title text;
  cust_name text;
BEGIN
  SELECT
    s.title INTO svc_title
  FROM
    public.services s
  WHERE
    s.id = NEW.service_id;

  SELECT
    p.full_name INTO cust_name
  FROM
    public.profiles p
  WHERE
    p.id = NEW.customer_id;

  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.provider_id,
    'booking_new',
    'New booking',
    COALESCE(cust_name, 'A customer') || ' booked "' || COALESCE(svc_title, 'a service') || '".',
    jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_notify_provider
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE PROCEDURE public.notify_provider_new_booking ();

-- Derive provider from the booked service (customers cannot pick a random provider_id)
CREATE OR REPLACE FUNCTION public.bookings_set_provider_from_service ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  SELECT
    s.provider_id INTO NEW.provider_id
  FROM
    public.services s
  WHERE
    s.id = NEW.service_id;

  IF NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_set_provider
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE PROCEDURE public.bookings_set_provider_from_service ();

-- ---------------------------------------------------------------------------
-- 7) Realtime (optional: subscribe to notifications in the browser)
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime
ADD TABLE public.notifications;

-- ---------------------------------------------------------------------------
-- 8) Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid () = id OR public.is_admin ());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid () = id)
WITH CHECK (auth.uid () = id);

CREATE POLICY "profiles_admin_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

-- Categories: public read, admin write
CREATE POLICY "categories_select_all"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "categories_admin_all"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

-- Services: everyone sees active; providers manage own when approved
CREATE POLICY "services_select_active"
ON public.services
FOR SELECT
TO anon, authenticated
USING (
  is_active
  OR auth.uid () = provider_id
  OR public.is_admin ()
);

CREATE POLICY "services_provider_insert"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid () = provider_id
  AND public.is_approved_provider ()
);

CREATE POLICY "services_provider_update"
ON public.services
FOR UPDATE
TO authenticated
USING (auth.uid () = provider_id AND public.is_approved_provider ())
WITH CHECK (auth.uid () = provider_id AND public.is_approved_provider ());

CREATE POLICY "services_provider_delete"
ON public.services
FOR DELETE
TO authenticated
USING (auth.uid () = provider_id AND public.is_approved_provider ());

-- Bookings
CREATE POLICY "bookings_select_participants"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  auth.uid () = customer_id
  OR auth.uid () = provider_id
  OR public.is_admin ()
);

CREATE POLICY "bookings_customer_insert"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid () = customer_id
  AND EXISTS (
    SELECT
      1
    FROM
      public.profiles pr
    WHERE
      pr.id = auth.uid ()
      AND pr.role = 'customer'
  )
  AND provider_id = (
    SELECT
      s.provider_id
    FROM
      public.services s
    WHERE
      s.id = service_id
  )
);

CREATE POLICY "bookings_admin_update"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

-- Notifications
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid () = user_id);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid () = user_id)
WITH CHECK (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- 9) Seed categories (match customer UI slugs in browse.js)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (slug, name, description, sort_order)
VALUES
  ('electrical', 'Electrical', 'Panels, lighting, outlets, smart-home installs.', 1),
  ('plumbing', 'Plumbing', 'Leaks, drains, fixtures, water heaters.', 2),
  ('hvac', 'HVAC', 'Heating and cooling tune-ups and repairs.', 3),
  ('landscape', 'Landscaping', 'Lawn, beds, irrigation, outdoor care.', 4),
  ('cleaning', 'Cleaning', 'Deep cleans, move-in/out, recurring housekeeping.', 5)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10) Promote your first admin (replace email after you sign up once)
-- -- UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
