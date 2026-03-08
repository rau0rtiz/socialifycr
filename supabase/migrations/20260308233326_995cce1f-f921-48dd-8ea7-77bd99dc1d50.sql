
-- UTM tracking table for campaign attribution
CREATE TABLE public.utm_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  campaign_name text NOT NULL,
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_campaign text NOT NULL,
  utm_term text,
  utm_content text,
  destination_url text NOT NULL,
  full_url text NOT NULL,
  meta_campaign_id text,
  meta_ad_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utm_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage UTM tracking"
  ON public.utm_tracking FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view UTM tracking"
  ON public.utm_tracking FOR SELECT
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can create UTM tracking"
  ON public.utm_tracking FOR INSERT
  TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update UTM tracking"
  ON public.utm_tracking FOR UPDATE
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete UTM tracking"
  ON public.utm_tracking FOR DELETE
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));
