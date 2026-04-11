
CREATE TABLE public.client_closers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_closers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage closers" ON public.client_closers FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view closers" ON public.client_closers FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));

INSERT INTO public.client_closers (client_id, name) VALUES
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Fran'),
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Román'),
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Jorge'),
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Diogo'),
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Joaquín'),
  ('bfac1c16-0e02-4828-9744-1084309a9752', 'Majo');
