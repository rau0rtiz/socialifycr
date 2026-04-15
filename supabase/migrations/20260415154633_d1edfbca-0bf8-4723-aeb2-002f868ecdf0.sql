
-- Create funnels table
CREATE TABLE public.funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  public_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Only admins can manage funnels
CREATE POLICY "Admins can manage funnels" ON public.funnels FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Anyone can view active funnels (for public funnel pages)
CREATE POLICY "Anyone can view active funnels" ON public.funnels FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- Add funnel_id to funnel_leads
ALTER TABLE public.funnel_leads ADD COLUMN funnel_id uuid REFERENCES public.funnels(id);

-- Seed the first funnel
INSERT INTO public.funnels (name, description, slug, public_path)
VALUES ('Roadmap Personalizado', 'Quiz interactivo de niveles de negocio para generar leads cualificados', 'roadmap-personalizado', '/funnel');
