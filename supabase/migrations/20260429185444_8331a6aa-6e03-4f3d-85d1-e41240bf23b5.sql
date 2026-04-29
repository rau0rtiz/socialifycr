-- 1. Agregar template_kind a ad_frameworks
ALTER TABLE public.ad_frameworks
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'legacy_matrix';

-- Validar valores permitidos
ALTER TABLE public.ad_frameworks
  DROP CONSTRAINT IF EXISTS ad_frameworks_template_kind_check;
ALTER TABLE public.ad_frameworks
  ADD CONSTRAINT ad_frameworks_template_kind_check
  CHECK (template_kind IN ('pool', 'awareness', 'launch', 'legacy_matrix'));

-- 2. Permitir nuevos tipos de dimensiones
ALTER TABLE public.ad_framework_dimensions
  DROP CONSTRAINT IF EXISTS ad_framework_dimensions_dimension_type_check;
-- Nota: la columna no tenía constraint estricta (es text), pero documentamos los tipos válidos:
-- 'angle', 'format', 'hook' (legacy)
-- 'awareness_level', 'core_message' (awareness mold)
-- 'phase' (launch mold)
-- 'content_type' (compartido — catálogo de tipos de contenido)

-- Agregar metadata jsonb para datos específicos del molde (fechas en fases, parent_id en core_message, etc.)
ALTER TABLE public.ad_framework_dimensions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Hacer angle_id y format_id opcionales en ad_variants
ALTER TABLE public.ad_variants
  ALTER COLUMN angle_id DROP NOT NULL;
ALTER TABLE public.ad_variants
  ALTER COLUMN format_id DROP NOT NULL;

-- 4. Agregar columnas para los nuevos moldes
ALTER TABLE public.ad_variants
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.ad_framework_dimensions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awareness_level_id uuid REFERENCES public.ad_framework_dimensions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS core_message_id uuid REFERENCES public.ad_framework_dimensions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_ad_variants_phase ON public.ad_variants(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_variants_awareness ON public.ad_variants(awareness_level_id) WHERE awareness_level_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_variants_core_message ON public.ad_variants(core_message_id) WHERE core_message_id IS NOT NULL;

-- 5. Modificar generate_ad_variants para que solo opere en frameworks legacy_matrix
CREATE OR REPLACE FUNCTION public.generate_ad_variants(_campaign_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_framework_id uuid;
  v_template_kind text;
  v_inserted integer := 0;
  v_has_hooks boolean;
BEGIN
  SELECT framework_id INTO v_framework_id
  FROM public.ad_campaigns
  WHERE id = _campaign_id;

  IF v_framework_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT template_kind INTO v_template_kind
  FROM public.ad_frameworks
  WHERE id = v_framework_id;

  -- Solo auto-genera matriz si es legacy
  IF v_template_kind <> 'legacy_matrix' THEN
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

-- 6. Migrar MASTERCLASS al molde launch
-- Borrar variantes y dimensiones actuales del framework MASTERCLASS
DELETE FROM public.ad_variants
WHERE campaign_id IN (
  SELECT id FROM public.ad_campaigns
  WHERE framework_id = '7d7988ef-75b6-491f-b27d-586f4270c01c'
);

DELETE FROM public.ad_framework_dimensions
WHERE framework_id = '7d7988ef-75b6-491f-b27d-586f4270c01c';

-- Cambiar a molde launch
UPDATE public.ad_frameworks
SET template_kind = 'launch'
WHERE id = '7d7988ef-75b6-491f-b27d-586f4270c01c';

-- Crear 3 fases por defecto
INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, position, color, metadata)
VALUES
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'phase', 'Calentamiento', 0, '#f59e0b',
   jsonb_build_object('description', 'Fase de pre-lanzamiento: generar interés y educar a la audiencia')),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'phase', 'Apertura del carrito', 1, '#10b981',
   jsonb_build_object('description', 'Anuncio del lanzamiento y apertura de inscripciones')),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'phase', 'Cierre', 2, '#ef4444',
   jsonb_build_object('description', 'Urgencia, últimas plazas, cierre del carrito'));

-- Crear catálogo de tipos de contenido para el molde launch (compartido por el framework)
INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, position)
VALUES
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'content_type', 'Historia Puro Texto', 0),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'content_type', 'Historia de Respuesta', 1),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'content_type', 'Anuncio 20s', 2),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'content_type', 'Contenido Orgánico + CTA', 3),
  ('7d7988ef-75b6-491f-b27d-586f4270c01c', 'content_type', 'Correo', 4);