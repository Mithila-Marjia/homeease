-- Allow admins to fully remove a pending provider so they can sign up again with the same email.

CREATE OR REPLACE FUNCTION public.admin_delete_pending_provider (_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid () IS NULL OR NOT public.is_admin () THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.id = _user_id
      AND p.role = 'provider'
      AND p.provider_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'not a pending provider application';
  END IF;

  -- Bookings reference services with ON DELETE RESTRICT — remove provider-side bookings first.
  DELETE FROM public.bookings
  WHERE
    provider_id = _user_id;

  DELETE FROM public.services
  WHERE
    provider_id = _user_id;

  DELETE FROM public.notifications
  WHERE
    user_id = _user_id;

  -- Deletes auth user; profile and auth.identities cascade. (Storage objects may remain orphaned;
  -- remove from Dashboard → Storage if needed.)
  DELETE FROM auth.users
  WHERE
    id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_pending_provider (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_delete_pending_provider (uuid) TO authenticated;
