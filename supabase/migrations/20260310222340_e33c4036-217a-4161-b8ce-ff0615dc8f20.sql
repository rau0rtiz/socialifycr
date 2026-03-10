
CREATE TABLE public.client_setters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

ALTER TABLE public.client_setters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage setters" ON public.client_setters FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view setters" ON public.client_setters FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert setters" ON public.client_setters FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete setters" ON public.client_setters FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

-- Seed existing setter names from appointments
INSERT INTO public.client_setters (client_id, name)
SELECT DISTINCT client_id, setter_name FROM public.setter_appointments
WHERE setter_name IS NOT NULL AND setter_name != ''
ON CONFLICT DO NOTHING;
