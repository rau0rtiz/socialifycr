ALTER TABLE public.client_feature_flags 
  ADD COLUMN checklist_items jsonb NOT NULL DEFAULT '[{"key":"checklist_quiz","label":"Ya realizó el quiz"},{"key":"checklist_video","label":"Ya vio el video antes de la llamada"},{"key":"checklist_whatsapp","label":"Ya se creó el grupo de WhatsApp"},{"key":"checklist_testimonials","label":"Ya se enviaron los testimonios"}]'::jsonb;

ALTER TABLE public.setter_appointments 
  ADD COLUMN checklist_responses jsonb NOT NULL DEFAULT '{}'::jsonb;