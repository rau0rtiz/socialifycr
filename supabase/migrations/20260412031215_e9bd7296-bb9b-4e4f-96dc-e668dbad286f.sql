
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'notification',
  sent_by UUID,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sent emails"
  ON public.sent_emails FOR ALL
  TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE INDEX idx_sent_emails_created_at ON public.sent_emails(created_at DESC);
CREATE INDEX idx_sent_emails_source ON public.sent_emails(source);
