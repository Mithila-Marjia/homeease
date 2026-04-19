-- Allow approved providers to update their own bookings (status, schedule, notes)
-- while locking financial and settlement fields. Admins remain unrestricted.

CREATE OR REPLACE FUNCTION public.bookings_enforce_provider_update ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin () THEN
    RETURN NEW;
  END IF;

  IF auth.uid () IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT public.is_approved_provider () THEN
    RAISE EXCEPTION 'Not an approved provider';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Invalid booking';
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Cannot change customer';
  END IF;
  IF NEW.service_id IS DISTINCT FROM OLD.service_id THEN
    RAISE EXCEPTION 'Cannot change service';
  END IF;
  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;
  IF NEW.total_cents IS DISTINCT FROM OLD.total_cents THEN
    RAISE EXCEPTION 'Cannot change booking total';
  END IF;
  IF NEW.admin_commission_cents IS DISTINCT FROM OLD.admin_commission_cents THEN
    RAISE EXCEPTION 'Cannot change platform fee';
  END IF;
  IF NEW.commission_percent_applied IS DISTINCT FROM OLD.commission_percent_applied THEN
    RAISE EXCEPTION 'Cannot change commission rate';
  END IF;
  IF NEW.admin_settled IS DISTINCT FROM OLD.admin_settled THEN
    RAISE EXCEPTION 'Cannot change settlement status';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot change created time';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_provider_update_guard ON public.bookings;

CREATE TRIGGER trg_bookings_provider_update_guard
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_enforce_provider_update ();

CREATE POLICY "bookings_provider_update_own"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid () = provider_id
  AND public.is_approved_provider ()
)
WITH CHECK (
  auth.uid () = provider_id
  AND public.is_approved_provider ()
);
