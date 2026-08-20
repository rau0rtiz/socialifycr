CREATE TABLE public.document_form_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.agency_proposals(id) ON DELETE CASCADE,
  slug text NOT NULL,
  respondent_name text,
  respondent_email text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  html_snapshot text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_form_responses_proposal ON public.document_form_responses(proposal_id, created_at DESC);

GRANT SELECT, DELETE ON public.document_form_responses TO authenticated;
GRANT ALL ON public.document_form_responses TO service_role;

ALTER TABLE public.document_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view form responses"
ON public.document_form_responses FOR SELECT TO authenticated
USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Admins can delete form responses"
ON public.document_form_responses FOR DELETE TO authenticated
USING (public.is_admin_or_higher(auth.uid()));

CREATE TRIGGER trg_document_form_responses_updated_at
BEFORE UPDATE ON public.document_form_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();