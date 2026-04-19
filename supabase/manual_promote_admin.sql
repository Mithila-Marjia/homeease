-- Run in Supabase → SQL Editor AFTER the user exists in Authentication.
--
-- 1) Sign up once (customer/signup.html) OR Dashboard → Authentication → Add user.
-- 2) Replace the email below with that account’s email.
-- 3) Run this entire script.

UPDATE public.profiles
SET
  role = 'admin'::public.user_role,
  provider_status = NULL
WHERE
  email = 'REPLACE_WITH_YOUR_EMAIL@example.com';

-- Should show 1 row updated. If 0 rows, the email does not match any profile.
-- Verify:
-- SELECT id, email, role FROM public.profiles WHERE email = 'REPLACE_WITH_YOUR_EMAIL@example.com';
