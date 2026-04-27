
-- ============================================================
-- 1. RLS: permitir a clientes VER frameworks/dimensiones/referencias de campañas asignadas
-- ============================================================

CREATE POLICY "Clients can view frameworks of their campaigns"
ON public.ad_frameworks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.framework_id = ad_frameworks.id
      AND c.client_id IS NOT NULL
      AND public.has_client_access(auth.uid(), c.client_id)
  )
);

CREATE POLICY "Clients can view dimensions of their campaigns"
ON public.ad_framework_dimensions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.framework_id = ad_framework_dimensions.framework_id
      AND c.client_id IS NOT NULL
      AND public.has_client_access(auth.uid(), c.client_id)
  )
);

CREATE POLICY "Clients can view references of their campaigns"
ON public.ad_framework_references FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE (
      c.framework_id = ad_framework_references.framework_id
      OR EXISTS (
        SELECT 1 FROM public.ad_variants v
        WHERE v.id = ad_framework_references.variant_id
          AND v.campaign_id = c.id
      )
    )
    AND c.client_id IS NOT NULL
    AND public.has_client_access(auth.uid(), c.client_id)
  )
);

-- ============================================================
-- 2. Insertar framework MASTERCLASS + dimensiones + campaña inicial
-- ============================================================

DO $$
DECLARE
  v_framework_id uuid;
  v_mind_coach_id uuid := 'bfac1c16-0e02-4828-9744-1084309a9752';
  v_angle_dolor uuid;
  v_angle_transf uuid;
  v_angle_auth uuid;
  v_format_texto uuid;
  v_format_resp uuid;
  v_format_ads uuid;
  v_format_organic uuid;
  v_hook_dolor uuid;
  v_hook_transf uuid;
  v_hook_auth uuid;
BEGIN
  -- Framework
  INSERT INTO public.ad_frameworks (name, description)
  VALUES (
    'MASTERCLASS',
    'Framework de contenido y pauta para masterclass de The Mind Coach. 4 formatos × 3 ángulos psicológicos (Dolor, Transformación, Autoridad).'
  )
  RETURNING id INTO v_framework_id;

  -- Ángulos
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'angle', 'Dolor', 'Identificar el problema o frustración que vive el prospecto.', 'hsl(0, 84%, 60%)', 0)
    RETURNING id INTO v_angle_dolor;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'angle', 'Transformación', 'Mostrar el cambio, el antes y después, el resultado deseado.', 'hsl(142, 71%, 45%)', 1)
    RETURNING id INTO v_angle_transf;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'angle', 'Autoridad', 'Demostrar credibilidad, experiencia, casos y resultados comprobables.', 'hsl(220, 90%, 56%)', 2)
    RETURNING id INTO v_angle_auth;

  -- Formatos
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'format', 'Historias Puro Texto', '1 historia por ángulo (3 piezas en total). Solo texto sobre fondo de color, directo y sin distracciones.', 'hsl(280, 65%, 55%)', 0)
    RETURNING id INTO v_format_texto;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'format', 'Historias de Respuesta', '2 historias por ángulo (6 piezas en total). Responder preguntas reales, comentarios o testimonios. Crear 2 variaciones por ángulo en el detalle de la variante.', 'hsl(330, 75%, 55%)', 1)
    RETURNING id INTO v_format_resp;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'format', 'Anuncios 20s', '1 anuncio por ángulo (3 piezas). Videos cortos de máximo 20 segundos, cada uno enfocado únicamente en su ángulo.', 'hsl(25, 95%, 55%)', 2)
    RETURNING id INTO v_format_ads;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'format', 'Contenido Orgánico + CTA', 'Agregar el CTA correspondiente al ángulo a TODO el contenido orgánico publicado durante el periodo de la campaña.', 'hsl(170, 70%, 42%)', 3)
    RETURNING id INTO v_format_organic;

  -- Hooks (mismos 3 ángulos)
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'hook', 'Dolor', 'Hook centrado en evidenciar la frustración actual.', 'hsl(0, 84%, 60%)', 0)
    RETURNING id INTO v_hook_dolor;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'hook', 'Transformación', 'Hook centrado en el cambio o el resultado deseado.', 'hsl(142, 71%, 45%)', 1)
    RETURNING id INTO v_hook_transf;
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'hook', 'Autoridad', 'Hook centrado en credibilidad, casos reales o datos.', 'hsl(220, 90%, 56%)', 2)
    RETURNING id INTO v_hook_auth;

  -- Campaña inicial asignada a The Mind Coach
  -- Las variantes (3×4×3=36) se generarán automáticamente vía trigger cartesian product
  INSERT INTO public.ad_campaigns (framework_id, client_id, name, description, status)
  VALUES (
    v_framework_id,
    v_mind_coach_id,
    'MASTERCLASS — Lanzamiento',
    'Campaña inicial del framework MASTERCLASS. 4 formatos × 3 ángulos × 3 hooks.',
    'active'
  );
END $$;
