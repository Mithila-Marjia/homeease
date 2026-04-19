-- Provider license / insurance files: Supabase Storage + profile references

-- ---------------------------------------------------------------------------
-- 1) Profile column (paths inside bucket provider-documents)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS provider_license_files jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.provider_license_files IS
'Array of {"path":"...","name":"original-filename"} for storage.objects in provider-documents bucket';

-- ---------------------------------------------------------------------------
-- 2) Storage bucket (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  FALSE,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3) Storage RLS: objects live at {user_id}/{...}
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "provider_documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "provider_documents_admin_select_all" ON storage.objects;

CREATE POLICY "provider_documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents'
  AND split_part(name, '/', 1) = auth.uid ()::text
);

CREATE POLICY "provider_documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND split_part(name, '/', 1) = auth.uid ()::text
);

CREATE POLICY "provider_documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND split_part(name, '/', 1) = auth.uid ()::text
);

CREATE POLICY "provider_documents_admin_select_all"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND public.is_admin ()
);
