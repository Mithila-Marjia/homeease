-- DANGER: Only use on an EMPTY dev project with no data you care about.
-- Run this if a previous migration attempt left types/functions behind and re-run fails.
-- Then run the migrations again (SQL Editor: paste 20260419120000_init_homeease.sql, then 20260419120001_...).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_notify_admins_provider ON public.profiles;
DROP TRIGGER IF EXISTS trg_bookings_notify_provider ON public.bookings;
DROP TRIGGER IF EXISTS trg_bookings_set_provider ON public.bookings;

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user () CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins_new_provider () CASCADE;
DROP FUNCTION IF EXISTS public.notify_provider_new_booking () CASCADE;
DROP FUNCTION IF EXISTS public.bookings_set_provider_from_service () CASCADE;
DROP FUNCTION IF EXISTS public.is_admin () CASCADE;
DROP FUNCTION IF EXISTS public.is_approved_provider () CASCADE;

DROP TYPE IF EXISTS public.booking_status CASCADE;
DROP TYPE IF EXISTS public.provider_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
