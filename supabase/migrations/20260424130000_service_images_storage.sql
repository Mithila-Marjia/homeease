-- Public images for service listings: providers upload to their own folder.
-- Required for provider service image uploads. If the app reports "Bucket not found",
-- apply this migration (Supabase Dashboard → SQL Editor → paste & run, or `supabase db push`).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "service_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_update_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "service_images_select_public" ON storage.objects;

-- Prefer JWT sub in storage.objects (matches upload path; avoids auth.uid() edge cases).
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

CREATE POLICY "service_images_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');
