-- Admins may update or delete any service (toggle visibility, remove listings).

CREATE POLICY "services_admin_update"
ON public.services
FOR UPDATE
TO authenticated
USING (public.is_admin ())
WITH CHECK (public.is_admin ());

CREATE POLICY "services_admin_delete"
ON public.services
FOR DELETE
TO authenticated
USING (public.is_admin ());
