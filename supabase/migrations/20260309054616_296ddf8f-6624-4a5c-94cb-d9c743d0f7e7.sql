
-- Create setter_appointments table for tracking high-ticket lead agendas
CREATE TABLE public.setter_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_name text NOT NULL,
  lead_phone text,
  lead_email text,
  appointment_date timestamp with time zone NOT NULL,
  setter_name text,
  estimated_value numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'CRC',
  status text NOT NULL DEFAULT 'scheduled',
  ad_campaign_id text,
  ad_campaign_name text,
  ad_id text,
  ad_name text,
  sale_id uuid,
  notes text,
  source text DEFAULT 'ads',
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setter_appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage appointments"
ON public.setter_appointments FOR ALL TO authenticated
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view appointments"
ON public.setter_appointments FOR SELECT TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert appointments"
ON public.setter_appointments FOR INSERT TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update appointments"
ON public.setter_appointments FOR UPDATE TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete appointments"
ON public.setter_appointments FOR DELETE TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- Updated_at trigger
CREATE TRIGGER update_setter_appointments_updated_at
  BEFORE UPDATE ON public.setter_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
