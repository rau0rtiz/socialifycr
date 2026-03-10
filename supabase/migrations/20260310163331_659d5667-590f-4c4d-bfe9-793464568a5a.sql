
-- Email marketing contacts table
CREATE TABLE public.email_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  subscribed_at timestamp with time zone DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, email)
);

ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email contacts" ON public.email_contacts
  FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view email contacts" ON public.email_contacts
  FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  from_name text NOT NULL DEFAULT 'Socialify',
  from_email text NOT NULL DEFAULT 'notificaciones@socialifycr.com',
  html_content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  target_tags text[] DEFAULT '{}',
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view email campaigns" ON public.email_campaigns
  FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

-- Campaign send logs
CREATE TABLE public.email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  resend_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage send logs" ON public.email_send_logs
  FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view send logs" ON public.email_send_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.email_campaigns ec
    WHERE ec.id = email_send_logs.campaign_id
    AND has_client_access(auth.uid(), ec.client_id)
  ));

-- Triggers for updated_at
CREATE TRIGGER update_email_contacts_updated_at
  BEFORE UPDATE ON public.email_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
