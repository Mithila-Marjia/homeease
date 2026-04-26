-- Coverage areas: admin-managed list; providers belong to one area; customers filter marketplace.

CREATE TABLE IF NOT EXISTS public.coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now ()
);

INSERT INTO public.coverage_areas (slug, name, sort_order)
VALUES
  ('dhaka', 'Dhaka', 1),
  ('cumilla', 'Cumilla', 2)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coverage_area_id uuid REFERENCES public.coverage_areas (id);

UPDATE public.profiles p
SET
  coverage_area_id = (
    SELECT
      id
    FROM
      public.coverage_areas
    WHERE
      slug = 'dhaka'
    LIMIT 1
  )
WHERE
  p.role = 'provider'
  AND p.coverage_area_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_coverage_area_id ON public.profiles (coverage_area_id);

ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coverage_areas_select_all" ON public.coverage_areas;

CREATE POLICY "coverage_areas_select_all"
ON public.coverage_areas FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS "coverage_areas_admin_all" ON public.coverage_areas;

CREATE POLICY "coverage_areas_admin_all"
ON public.coverage_areas FOR ALL TO authenticated USING (public.is_admin ())
WITH CHECK (public.is_admin ());

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
  area_id uuid;
BEGIN
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

  area_id := NULL;
  IF r = 'provider' THEN
    IF (NEW.raw_user_meta_data ? 'coverage_area_slug') THEN
      SELECT
        a.id INTO area_id
      FROM
        public.coverage_areas a
      WHERE
        a.slug = NEW.raw_user_meta_data ->> 'coverage_area_slug'
      LIMIT 1;
    END IF;
    IF area_id IS NULL THEN
      area_id := NULLIF(NEW.raw_user_meta_data ->> 'coverage_area_id', '')::uuid;
    END IF;
    IF area_id IS NULL THEN
      SELECT
        id INTO area_id
      FROM
        public.coverage_areas
      WHERE
        slug = 'dhaka'
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    provider_status,
    experience_years,
    primary_category_id,
    coverage_area_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    r::public.user_role,
    ps,
    exp_years,
    cat_id,
    area_id
  );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.popular_home_services (int);

CREATE OR REPLACE FUNCTION public.popular_home_services (
  p_limit int DEFAULT 3,
  p_coverage_area_id uuid DEFAULT NULL
)
RETURNS TABLE (
  service_id uuid,
  title text,
  slug text,
  description text,
  price_cents int,
  fee_cents int,
  image_url text,
  tag text,
  provider_id uuid,
  provider_name text,
  coverage_area_name text,
  rating_avg numeric,
  rating_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.slug,
    s.description,
    s.price_cents,
    s.fee_cents,
    s.image_url,
    s.tag,
    p.id,
    p.full_name,
    ca.name,
    COALESCE(st.rating_avg, 0),
    COALESCE(st.rating_count, 0::bigint)
  FROM
    public.services s
    INNER JOIN public.profiles p ON p.id = s.provider_id
    LEFT JOIN public.coverage_areas ca ON ca.id = p.coverage_area_id
    LEFT JOIN (
      SELECT
        pr_sub.provider_id,
        AVG(pr_sub.rating)::numeric AS rating_avg,
        COUNT(*)::bigint AS rating_count
      FROM
        public.provider_reviews pr_sub
      GROUP BY
        pr_sub.provider_id
    ) st ON st.provider_id = p.id
  WHERE
    s.is_active = TRUE
    AND p.role = 'provider'
    AND p.provider_status = 'approved'
    AND (
      p_coverage_area_id IS NULL
      OR p.coverage_area_id = p_coverage_area_id
    )
  ORDER BY
    (COALESCE(st.rating_count, 0) > 0) DESC,
    COALESCE(st.rating_avg, 0) DESC,
    s.created_at DESC
  LIMIT COALESCE(NULLIF(p_limit, 0), 3);
$$;

GRANT EXECUTE ON FUNCTION public.popular_home_services (int, uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.popular_home_services (int, uuid) TO authenticated;
