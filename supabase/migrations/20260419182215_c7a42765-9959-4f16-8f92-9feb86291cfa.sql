
-- 1. Add columns to sent_emails for resend support
ALTER TABLE public.sent_emails
  ADD COLUMN IF NOT EXISTS attachments_meta jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS parent_email_id uuid REFERENCES public.sent_emails(id) ON DELETE SET NULL;

-- 2. Function: team members with activity (visible to any team member of the client)
CREATE OR REPLACE FUNCTION public.get_team_members_with_activity(_client_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role public.client_role,
  last_sign_in_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    ctm.role,
    u.last_sign_in_at
  FROM public.client_team_members ctm
  JOIN public.profiles p ON p.id = ctm.user_id
  LEFT JOIN auth.users u ON u.id = ctm.user_id
  WHERE ctm.client_id = _client_id
    AND public.has_client_access(auth.uid(), _client_id)
$$;

-- 3. Backfill attachments_meta for past funnel emails
UPDATE public.sent_emails se
SET attachments_meta = jsonb_build_array(
  jsonb_build_object(
    'source', 'storage',
    'bucket', 'content-images',
    'path', CASE fl.business_level
      WHEN 1 THEN 'documents/Nivel-1.pdf'
      WHEN 2 THEN 'documents/NIVEL-2.pdf'
      WHEN 3 THEN 'documents/Nivel-3.pdf'
      WHEN 4 THEN 'documents/Nivel-4.pdf'
      WHEN 5 THEN 'documents/NIVEL-5.pdf'
      WHEN 6 THEN 'documents/NIVEL-6.pdf'
    END,
    'filename', 'Roadmap-Nivel-' || fl.business_level || '.pdf'
  )
),
metadata = jsonb_build_object(
  'business_level', fl.business_level,
  'name', fl.name
)
FROM public.funnel_leads fl
WHERE se.source = 'funnel'
  AND se.attachments_meta IS NULL
  AND lower(fl.email) = lower(se.recipient_email)
  AND fl.business_level BETWEEN 1 AND 6;
