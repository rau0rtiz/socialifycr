-- Add client_id to ad_frameworks: NULL = agency, otherwise = specific client
ALTER TABLE public.ad_frameworks
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX idx_ad_frameworks_client_id ON public.ad_frameworks(client_id);

-- Replace the broad "Clients can view frameworks of their campaigns" policy
-- with a stricter rule: clients only see frameworks explicitly assigned to their client_id.
DROP POLICY IF EXISTS "Clients can view frameworks of their campaigns" ON public.ad_frameworks;

CREATE POLICY "Clients can view their own frameworks"
ON public.ad_frameworks
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND public.has_client_access(auth.uid(), client_id)
);
