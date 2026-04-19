-- Optional: expose notifications to Supabase Realtime (live badge updates).
-- Wrapped so a duplicate membership does not fail `supabase db push`.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime
  ADD TABLE public.notifications;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping realtime publication for notifications: %', SQLERRM;
END;
$$;
