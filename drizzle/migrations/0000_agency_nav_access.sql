CREATE TABLE public.agency_nav_access (
  user_id uuid PRIMARY KEY,
  hidden_sections text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_nav_access TO authenticated;
GRANT ALL ON public.agency_nav_access TO service_role;
ALTER TABLE public.agency_nav_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or owner reads all" ON public.agency_nav_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_system_role(auth.uid(), 'owner'));
CREATE POLICY "Owner inserts" ON public.agency_nav_access FOR INSERT TO authenticated
  WITH CHECK (public.has_system_role(auth.uid(), 'owner'));
CREATE POLICY "Owner updates" ON public.agency_nav_access FOR UPDATE TO authenticated
  USING (public.has_system_role(auth.uid(), 'owner')) WITH CHECK (public.has_system_role(auth.uid(), 'owner'));
CREATE POLICY "Owner deletes" ON public.agency_nav_access FOR DELETE TO authenticated
  USING (public.has_system_role(auth.uid(), 'owner'));