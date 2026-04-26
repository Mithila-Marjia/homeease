-- Provider reviews (one per completed booking) + RPC for home page “popular” services.

CREATE TABLE public.provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (
    rating >= 1
    AND rating <= 5
  ),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT provider_reviews_one_per_booking UNIQUE (booking_id)
);

CREATE INDEX idx_provider_reviews_provider ON public.provider_reviews (provider_id);

ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_reviews_select_all"
ON public.provider_reviews FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "provider_reviews_insert_completed_booking"
ON public.provider_reviews FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid ()
  AND EXISTS (
    SELECT
      1
    FROM
      public.bookings b
    WHERE
      b.id = booking_id
      AND b.customer_id = auth.uid ()
      AND b.provider_id = provider_reviews.provider_id
      AND b.status = 'completed'
  )
);

-- Top services: prefer providers with reviews (higher avg), then newest listings.
CREATE OR REPLACE FUNCTION public.popular_home_services (p_limit int DEFAULT 3)
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
    COALESCE(st.rating_avg, 0),
    COALESCE(st.rating_count, 0::bigint)
  FROM
    public.services s
    INNER JOIN public.profiles p ON p.id = s.provider_id
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
  ORDER BY
    (COALESCE(st.rating_count, 0) > 0) DESC,
    COALESCE(st.rating_avg, 0) DESC,
    s.created_at DESC
  LIMIT COALESCE(NULLIF(p_limit, 0), 3);
$$;

GRANT EXECUTE ON FUNCTION public.popular_home_services (int) TO anon;

GRANT EXECUTE ON FUNCTION public.popular_home_services (int) TO authenticated;
