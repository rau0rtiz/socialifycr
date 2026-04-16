
ALTER TABLE public.email_unsubscribe_tokens ADD COLUMN reason text;

ALTER TABLE public.email_contacts ADD COLUMN unsubscribe_reason text;
