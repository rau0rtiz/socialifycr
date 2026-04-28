-- Tabla de cobros de la agencia (Socialify)
CREATE TABLE public.agency_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  collection_type TEXT NOT NULL DEFAULT 'recurring', -- 'recurring' | 'one_off' | 'post_production'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_collections_due_date ON public.agency_collections(due_date);
CREATE INDEX idx_agency_collections_status ON public.agency_collections(status);
CREATE INDEX idx_agency_collections_customer ON public.agency_collections(lower(customer_name));

ALTER TABLE public.agency_collections ENABLE ROW LEVEL SECURITY;

-- Solo admin/owner gestiona cobros de la agencia
CREATE POLICY "Admins manage agency collections"
ON public.agency_collections
FOR ALL
TO authenticated
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE TRIGGER agency_collections_updated_at
BEFORE UPDATE ON public.agency_collections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
