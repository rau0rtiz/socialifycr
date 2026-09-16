CREATE TABLE IF NOT EXISTS public.msg_link_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.msg_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.msg_messages(id) ON DELETE SET NULL,
  url text NOT NULL,
  offered_by msg_author NOT NULL DEFAULT 'humano',
  offered_at timestamptz NOT NULL DEFAULT now(),
  matched_appointment_id uuid REFERENCES public.msg_appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.msg_link_offers TO authenticated;
GRANT ALL ON public.msg_link_offers TO service_role;
ALTER TABLE public.msg_link_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage link offers" ON public.msg_link_offers
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS msg_appointments_external_uri_key ON public.msg_appointments (external_uri);
CREATE INDEX IF NOT EXISTS msg_link_offers_unmatched_idx ON public.msg_link_offers (offered_at DESC) WHERE matched_appointment_id IS NULL;