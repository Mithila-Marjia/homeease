-- Expose provider coverage area name on popular_home_services for the customer UI.

DROP FUNCTION IF EXISTS public.popular_home_services (int, uuid);

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
