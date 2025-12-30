-- Create campaign_goals table to store user-defined conversion goals per campaign
CREATE TABLE public.campaign_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  action_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.campaign_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view campaign goals"
ON public.campaign_goals
FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert campaign goals"
ON public.campaign_goals
FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update campaign goals"
ON public.campaign_goals
FOR UPDATE
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete campaign goals"
ON public.campaign_goals
FOR DELETE
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage campaign goals"
ON public.campaign_goals
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_campaign_goals_updated_at
BEFORE UPDATE ON public.campaign_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();