
-- 1. Add due_date to ad_variants
ALTER TABLE public.ad_variants
  ADD COLUMN IF NOT EXISTS due_date date;

-- 2. Allow clients (with client access) to UPDATE only status & due_date of their campaign variants
CREATE POLICY "Clients can update variants status of their campaigns"
ON public.ad_variants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.id = ad_variants.campaign_id
      AND c.client_id IS NOT NULL
      AND has_client_access(auth.uid(), c.client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.id = ad_variants.campaign_id
      AND c.client_id IS NOT NULL
      AND has_client_access(auth.uid(), c.client_id)
  )
);
