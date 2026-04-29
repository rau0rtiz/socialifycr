-- 1. Add campaign_id to sent_emails
ALTER TABLE public.sent_emails
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sent_emails_campaign_id ON public.sent_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_opened_at ON public.sent_emails(opened_at) WHERE opened_at IS NOT NULL;

-- 2. Add opened_count to email_campaigns
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0;

-- 3. Backfill historical data: link sent_emails to campaigns via resend_id <-> email_send_logs
UPDATE public.sent_emails se
SET campaign_id = esl.campaign_id
FROM public.email_send_logs esl
WHERE se.campaign_id IS NULL
  AND se.resend_id IS NOT NULL
  AND esl.resend_id = se.resend_id
  AND esl.campaign_id IS NOT NULL;

-- 4. Backfill opened_count for existing campaigns
UPDATE public.email_campaigns ec
SET opened_count = sub.cnt
FROM (
  SELECT campaign_id, COUNT(*)::int AS cnt
  FROM public.sent_emails
  WHERE campaign_id IS NOT NULL AND opened_at IS NOT NULL
  GROUP BY campaign_id
) sub
WHERE ec.id = sub.campaign_id;

-- 5. Trigger to keep opened_count in sync when an email is opened
CREATE OR REPLACE FUNCTION public.bump_campaign_opened_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL
     AND NEW.opened_at IS NOT NULL
     AND OLD.opened_at IS NULL THEN
    UPDATE public.email_campaigns
    SET opened_count = opened_count + 1
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_campaign_opened_count ON public.sent_emails;
CREATE TRIGGER trg_bump_campaign_opened_count
AFTER UPDATE OF opened_at ON public.sent_emails
FOR EACH ROW
EXECUTE FUNCTION public.bump_campaign_opened_count();