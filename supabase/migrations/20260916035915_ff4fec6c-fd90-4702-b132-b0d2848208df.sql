ALTER TABLE public.msg_drafts DROP CONSTRAINT IF EXISTS msg_drafts_status_check;
ALTER TABLE public.msg_drafts
  ADD CONSTRAINT msg_drafts_status_check
  CHECK (status IN ('pendiente','editado','descartado','obsoleto','enviado'));