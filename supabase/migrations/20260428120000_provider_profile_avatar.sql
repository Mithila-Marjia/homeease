-- Provider face photo for signup / profile: public URL on profiles + Storage bucket.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text NULL;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL of provider profile (face) photo.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-avatars',
  'provider-avatars',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "provider_avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatars_select_public" ON storage.objects;

CREATE POLICY "provider_avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-avatars'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

CREATE POLICY "provider_avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-avatars'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
)
WITH CHECK (
  bucket_id = 'provider-avatars'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

CREATE POLICY "provider_avatars_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-avatars'
  AND split_part(name, '/', 1) = (auth.jwt () ->> 'sub')
);

CREATE POLICY "provider_avatars_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'provider-avatars');
