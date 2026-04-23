-- 1. Add feature flag column
ALTER TABLE public.client_feature_flags
ADD COLUMN IF NOT EXISTS reservations_widget boolean NOT NULL DEFAULT false;

-- 2. Create lead_reservations table
CREATE TABLE public.lead_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id uuid NULL,
  customer_name text NOT NULL,
  customer_phone text NULL,
  customer_email text NULL,
  product_id uuid NULL,
  product_name text NULL,
  deposit_amount numeric NOT NULL DEFAULT 200,
  currency text NOT NULL DEFAULT 'USD',
  reserved_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','lost','expired')),
  sale_id uuid NULL,
  notes text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_reservations_client ON public.lead_reservations(client_id);
CREATE INDEX idx_lead_reservations_status ON public.lead_reservations(status);
CREATE INDEX idx_lead_reservations_expires ON public.lead_reservations(expires_at);
CREATE INDEX idx_lead_reservations_lead ON public.lead_reservations(lead_id);

-- 3. Enable RLS
ALTER TABLE public.lead_reservations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Admins manage reservations"
ON public.lead_reservations
FOR ALL
TO authenticated
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members view reservations"
ON public.lead_reservations
FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members insert reservations"
ON public.lead_reservations
FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members update reservations"
ON public.lead_reservations
FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members delete reservations"
ON public.lead_reservations
FOR DELETE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- 5. Trigger to auto-set expires_at and update updated_at
CREATE OR REPLACE FUNCTION public.set_lead_reservation_expires()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.reserved_at + INTERVAL '3 months';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_reservation_expires
BEFORE INSERT OR UPDATE ON public.lead_reservations
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_reservation_expires();

-- 6. Function to mark expired reservations
CREATE OR REPLACE FUNCTION public.mark_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lead_reservations
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at < CURRENT_DATE;
END;
$$;