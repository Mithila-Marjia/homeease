-- Storage RLS: use JWT subject for path ownership (reliable in storage.objects context).
-- Fixes "new row violates row-level security policy" when auth.uid() does not match split_part in INSERT.
-- Adds public SELECT so public bucket URLs work for anonymous image loads.

DROP POLICY IF EXISTS "service_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_update_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_select_public" ON storage.objects;

CREATE POLICY "service_images_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

CREATE POLICY "service_images_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
)
WITH CHECK (
  bucket_id = 'service-images'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

CREATE POLICY "service_images_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

-- Public read for marketplace / getPublicUrl CDN fetches
CREATE POLICY "service_images_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');
