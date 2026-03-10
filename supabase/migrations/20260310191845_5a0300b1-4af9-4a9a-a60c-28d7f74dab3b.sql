
ALTER TABLE public.client_feature_flags ADD COLUMN generador_pauta boolean NOT NULL DEFAULT false;

-- Enable for PetShop2GoCR
UPDATE public.client_feature_flags SET generador_pauta = true WHERE client_id = '32b6e8aa-4644-4e02-8ee6-1ef79106711b';

-- If no feature flags row exists for this client, insert one
INSERT INTO public.client_feature_flags (client_id, generador_pauta, contenido_section)
VALUES ('32b6e8aa-4644-4e02-8ee6-1ef79106711b', true, true)
ON CONFLICT (client_id) DO UPDATE SET generador_pauta = true;
