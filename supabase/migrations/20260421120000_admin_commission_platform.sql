-- Platform commission %, per-booking admin cut, settlement flag, and admin notification access.

-- ---------------------------------------------------------------------------
-- 1) Singleton settings (commission applies to booking total_cents)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id int PRIMARY KEY CHECK (id = 1),
  commission_percent numeric(5, 2) NOT NULL DEFAULT 10.00,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, commission_percent)
VALUES (1, 10.00)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Booking columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS commission_percent_applied numeric(5, 2);

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS admin_commission_cents int NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS admin_settled boolean NOT NULL DEFAULT false;

-- Backfill existing rows (if any) using current platform commission
UPDATE public.bookings
SET
  commission_percent_applied = (
    SELECT
      commission_percent
    FROM
      public.platform_settings
    WHERE
      id = 1
  ),
  admin_commission_cents = round(
    total_cents * (
      SELECT
        commission_percent / 100.0
      FROM
        public.platform_settings
      WHERE
        id = 1
    )
  )::int;

-- ---------------------------------------------------------------------------
-- 3) Apply provider + commission in one BEFORE INSERT trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bookings_set_provider_from_service ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  pct numeric(5, 2);
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

  SELECT
    ps.commission_percent INTO pct
  FROM
    public.platform_settings ps
  WHERE
    ps.id = 1;

  IF pct IS NULL THEN
    pct := 10.00;
  END IF;

  NEW.commission_percent_applied := pct;
  NEW.admin_commission_cents := round(NEW.total_cents * pct / 100.0)::int;
  NEW.admin_settled := COALESCE(NEW.admin_settled, FALSE);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) RLS: platform_settings (admins only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_admin_select"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.is_admin ());

CREATE POLICY "platform_settings_admin_update"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

-- ---------------------------------------------------------------------------
-- 5) Admins can read all notifications (support / monitoring)
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications_admin_select_all"
ON public.notifications
FOR SELECT
TO authenticated
USING (public.is_admin ());

CREATE POLICY "notifications_admin_update_all"
ON public.notifications
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());
