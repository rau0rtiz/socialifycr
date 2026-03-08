ALTER TABLE public.client_feature_flags 
  ADD COLUMN IF NOT EXISTS ventas_section boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contenido_section boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reportes_section boolean NOT NULL DEFAULT false;