
-- a) Backfill: heredar client_id desde framework
UPDATE public.ad_campaigns c
SET client_id = f.client_id
FROM public.ad_frameworks f
WHERE c.framework_id = f.id
  AND c.client_id IS NULL
  AND f.client_id IS NOT NULL;

-- b) Trigger para heredar client_id en futuras campañas
CREATE OR REPLACE FUNCTION public.inherit_campaign_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL AND NEW.framework_id IS NOT NULL THEN
    SELECT client_id INTO NEW.client_id FROM public.ad_frameworks WHERE id = NEW.framework_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inherit_campaign_client_id ON public.ad_campaigns;
CREATE TRIGGER trg_inherit_campaign_client_id
BEFORE INSERT OR UPDATE OF framework_id, client_id ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.inherit_campaign_client_id();

-- c) RLS más amplias: clientes con acceso al framework ven y editan todo lo de adentro

-- ad_framework_dimensions: ya tiene SELECT vía campañas; agregamos acceso directo por framework
DROP POLICY IF EXISTS "Clients can view dimensions of their frameworks" ON public.ad_framework_dimensions;
CREATE POLICY "Clients can view dimensions of their frameworks"
ON public.ad_framework_dimensions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_frameworks f
    WHERE f.id = ad_framework_dimensions.framework_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

-- ad_framework_references: acceso directo por framework
DROP POLICY IF EXISTS "Clients can view references of their frameworks" ON public.ad_framework_references;
CREATE POLICY "Clients can view references of their frameworks"
ON public.ad_framework_references FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_frameworks f
    WHERE f.id = ad_framework_references.framework_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.ad_variants v
    JOIN public.ad_campaigns c ON c.id = v.campaign_id
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE v.id = ad_framework_references.variant_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can insert references of their frameworks" ON public.ad_framework_references;
CREATE POLICY "Clients can insert references of their frameworks"
ON public.ad_framework_references FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_frameworks f
    WHERE f.id = ad_framework_references.framework_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can update references of their frameworks" ON public.ad_framework_references;
CREATE POLICY "Clients can update references of their frameworks"
ON public.ad_framework_references FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_frameworks f
    WHERE f.id = ad_framework_references.framework_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can delete references of their frameworks" ON public.ad_framework_references;
CREATE POLICY "Clients can delete references of their frameworks"
ON public.ad_framework_references FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_frameworks f
    WHERE f.id = ad_framework_references.framework_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

-- ad_variants: SELECT/UPDATE/INSERT/DELETE para clientes con acceso al framework
DROP POLICY IF EXISTS "Clients can view variants of their frameworks" ON public.ad_variants;
CREATE POLICY "Clients can view variants of their frameworks"
ON public.ad_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = ad_variants.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can update variants status of their campaigns" ON public.ad_variants;
DROP POLICY IF EXISTS "Clients can update variants of their frameworks" ON public.ad_variants;
CREATE POLICY "Clients can update variants of their frameworks"
ON public.ad_variants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = ad_variants.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = ad_variants.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can insert variants of their frameworks" ON public.ad_variants;
CREATE POLICY "Clients can insert variants of their frameworks"
ON public.ad_variants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = ad_variants.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can delete variants of their frameworks" ON public.ad_variants;
CREATE POLICY "Clients can delete variants of their frameworks"
ON public.ad_variants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = ad_variants.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

-- launch_phase_tasks: clientes con acceso al framework pueden gestionar
DROP POLICY IF EXISTS "Clients can view tasks of their frameworks" ON public.launch_phase_tasks;
CREATE POLICY "Clients can view tasks of their frameworks"
ON public.launch_phase_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = launch_phase_tasks.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can insert tasks of their frameworks" ON public.launch_phase_tasks;
CREATE POLICY "Clients can insert tasks of their frameworks"
ON public.launch_phase_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = launch_phase_tasks.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can update tasks of their frameworks" ON public.launch_phase_tasks;
CREATE POLICY "Clients can update tasks of their frameworks"
ON public.launch_phase_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = launch_phase_tasks.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);

DROP POLICY IF EXISTS "Clients can delete tasks of their frameworks" ON public.launch_phase_tasks;
CREATE POLICY "Clients can delete tasks of their frameworks"
ON public.launch_phase_tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    JOIN public.ad_frameworks f ON f.id = c.framework_id
    WHERE c.id = launch_phase_tasks.campaign_id
      AND f.client_id IS NOT NULL
      AND has_client_access(auth.uid(), f.client_id)
  )
);
