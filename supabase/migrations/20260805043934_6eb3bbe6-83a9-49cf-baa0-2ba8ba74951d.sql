CREATE UNIQUE INDEX IF NOT EXISTS funnel_leads_lead_uid_uniq
  ON public.funnel_leads ((answers->>'lead_uid'))
  WHERE (answers->>'lead_uid') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dedupe_funnel_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.funnel_leads;
  uid text;
BEGIN
  uid := NEW.answers->>'lead_uid';

  IF uid IS NOT NULL THEN
    SELECT * INTO existing
    FROM public.funnel_leads
    WHERE answers->>'lead_uid' = uid
    ORDER BY created_at ASC
    LIMIT 1;
  ELSIF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    SELECT * INTO existing
    FROM public.funnel_leads
    WHERE lower(email) = lower(NEW.email)
      AND funnel_id IS NOT DISTINCT FROM NEW.funnel_id
      AND created_at > now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF existing.id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.funnel_leads
  SET name           = COALESCE(NULLIF(btrim(NEW.name), ''), name),
      email          = COALESCE(NULLIF(btrim(NEW.email), ''), email),
      phone          = COALESCE(NULLIF(btrim(NEW.phone), ''), phone),
      challenge      = COALESCE(NEW.challenge, challenge),
      industry       = COALESCE(NEW.industry, industry),
      revenue_range  = COALESCE(NEW.revenue_range, revenue_range),
      business_level = COALESCE(NEW.business_level, business_level),
      funnel_id      = COALESCE(NEW.funnel_id, funnel_id),
      answers        = COALESCE(existing.answers, '{}'::jsonb) || COALESCE(NEW.answers, '{}'::jsonb)
  WHERE id = existing.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS dedupe_funnel_lead_trg ON public.funnel_leads;
CREATE TRIGGER dedupe_funnel_lead_trg
BEFORE INSERT ON public.funnel_leads
FOR EACH ROW EXECUTE FUNCTION public.dedupe_funnel_lead();