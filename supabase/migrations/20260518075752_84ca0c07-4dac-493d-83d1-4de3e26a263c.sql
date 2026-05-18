-- Make Bram admin
INSERT INTO public.user_roles (user_id, role) VALUES ('3211c6c7-4152-4d89-9e71-f4c55fb574bc', 'admin') ON CONFLICT DO NOTHING;

-- Restrict deleting leads to admins only
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));