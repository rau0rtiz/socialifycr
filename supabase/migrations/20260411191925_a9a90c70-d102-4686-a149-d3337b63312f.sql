
ALTER TABLE public.client_feature_flags
  ADD COLUMN IF NOT EXISTS business_setup_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS asistencia_section boolean NOT NULL DEFAULT true;
