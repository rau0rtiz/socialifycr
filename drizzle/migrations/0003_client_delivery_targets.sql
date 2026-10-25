CREATE TABLE public.client_delivery_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  monthly_target INTEGER NOT NULL DEFAULT 0 CHECK (monthly_target >= 0 AND monthly_target <= 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, content_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_delivery_targets TO authenticated;
GRANT ALL ON public.client_delivery_targets TO service_role;

ALTER TABLE public.client_delivery_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage delivery targets"
ON public.client_delivery_targets
FOR ALL
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

COMMENT ON TABLE public.client_delivery_targets IS 'Fixed monthly delivery targets per client and content type (reel, story, foto, diseno, carrusel, correo, ...). Replaces per-month content_calendar_goals.';
COMMENT ON TABLE public.content_calendar_goals IS 'DEPRECATED: replaced by client_delivery_targets (fixed per-client monthly targets by content type).';