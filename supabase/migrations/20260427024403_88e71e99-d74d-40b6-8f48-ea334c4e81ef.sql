ALTER TABLE public.ad_variants
  ADD COLUMN IF NOT EXISTS creative_type text,
  ADD COLUMN IF NOT EXISTS slides jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ad_variants
  DROP CONSTRAINT IF EXISTS ad_variants_creative_type_check;
ALTER TABLE public.ad_variants
  ADD CONSTRAINT ad_variants_creative_type_check
  CHECK (creative_type IS NULL OR creative_type IN ('photo','reel','carousel'));