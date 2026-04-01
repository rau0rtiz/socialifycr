
ALTER TABLE public.setter_appointments 
  ADD COLUMN lead_context text DEFAULT NULL,
  ADD COLUMN checklist_quiz boolean NOT NULL DEFAULT false,
  ADD COLUMN checklist_video boolean NOT NULL DEFAULT false,
  ADD COLUMN checklist_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN checklist_testimonials boolean NOT NULL DEFAULT false;
