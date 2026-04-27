-- Add variant-level references support
ALTER TABLE public.ad_framework_references
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.ad_variants(id) ON DELETE CASCADE;

ALTER TABLE public.ad_framework_references
  ALTER COLUMN framework_id DROP NOT NULL;

-- Ensure each row belongs to either a framework or a variant (we keep both flexible)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ad_framework_references_scope_check'
  ) THEN
    ALTER TABLE public.ad_framework_references
      ADD CONSTRAINT ad_framework_references_scope_check
      CHECK (framework_id IS NOT NULL OR variant_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_framework_references_variant_id
  ON public.ad_framework_references(variant_id);
