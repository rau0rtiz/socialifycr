-- Allow frameworks without "hook" dimension (2D matrix: angles × formats)

-- 1) Make hook_id nullable
ALTER TABLE public.ad_variants ALTER COLUMN hook_id DROP NOT NULL;

-- 2) Replace unique constraint to handle NULL hook_id
ALTER TABLE public.ad_variants
  DROP CONSTRAINT ad_variants_campaign_id_angle_id_format_id_hook_id_key;

CREATE UNIQUE INDEX ad_variants_unique_with_hook
  ON public.ad_variants (campaign_id, angle_id, format_id, hook_id)
  WHERE hook_id IS NOT NULL;

CREATE UNIQUE INDEX ad_variants_unique_no_hook
  ON public.ad_variants (campaign_id, angle_id, format_id)
  WHERE hook_id IS NULL;

-- 3) Update generate_ad_variants to support frameworks without hooks
CREATE OR REPLACE FUNCTION public.generate_ad_variants(_campaign_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_framework_id uuid;
  v_inserted integer;
  v_has_hooks boolean;
BEGIN
  SELECT framework_id INTO v_framework_id
  FROM public.ad_campaigns
  WHERE id = _campaign_id;

  IF v_framework_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ad_framework_dimensions
    WHERE framework_id = v_framework_id AND dimension_type = 'hook'
  ) INTO v_has_hooks;

  IF v_has_hooks THEN
    INSERT INTO public.ad_variants (campaign_id, angle_id, format_id, hook_id, status)
    SELECT _campaign_id, a.id, f.id, h.id, 'draft'
    FROM public.ad_framework_dimensions a
    CROSS JOIN public.ad_framework_dimensions f
    CROSS JOIN public.ad_framework_dimensions h
    WHERE a.framework_id = v_framework_id AND a.dimension_type = 'angle'
      AND f.framework_id = v_framework_id AND f.dimension_type = 'format'
      AND h.framework_id = v_framework_id AND h.dimension_type = 'hook'
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.ad_variants (campaign_id, angle_id, format_id, hook_id, status)
    SELECT _campaign_id, a.id, f.id, NULL, 'draft'
    FROM public.ad_framework_dimensions a
    CROSS JOIN public.ad_framework_dimensions f
    WHERE a.framework_id = v_framework_id AND a.dimension_type = 'angle'
      AND f.framework_id = v_framework_id AND f.dimension_type = 'format'
    ON CONFLICT DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

-- 4) Clean MASTERCLASS framework: remove hook dimensions and existing variants so it regenerates as 2D
DELETE FROM public.ad_variants
WHERE campaign_id IN (SELECT id FROM public.ad_campaigns WHERE framework_id = '7d7988ef-75b6-491f-b27d-586f4270c01c');

DELETE FROM public.ad_framework_dimensions
WHERE framework_id = '7d7988ef-75b6-491f-b27d-586f4270c01c' AND dimension_type = 'hook';