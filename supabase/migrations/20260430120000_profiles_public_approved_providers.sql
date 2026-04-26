-- Allow the public customer site (anon + authenticated) to list approved providers
-- for the marketplace. The app should only .select() public fields (full_name, avatar_url, etc.).
-- Sensitive columns (email, phone, license files) remain in the row; use a SQL VIEW later
-- if you need stricter column isolation.

CREATE POLICY "profiles_select_public_approved_providers"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  role = 'provider'
  AND provider_status = 'approved'
);
