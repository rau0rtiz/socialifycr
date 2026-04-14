
CREATE TABLE public.funnel_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_level INTEGER NOT NULL,
  industry TEXT,
  revenue_range TEXT,
  team_size TEXT,
  challenge TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  calendly_clicked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel leads"
ON public.funnel_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view funnel leads"
ON public.funnel_leads
FOR SELECT
TO authenticated
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update funnel leads"
ON public.funnel_leads
FOR UPDATE
TO authenticated
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete funnel leads"
ON public.funnel_leads
FOR DELETE
TO authenticated
USING (is_admin_or_higher(auth.uid()));
