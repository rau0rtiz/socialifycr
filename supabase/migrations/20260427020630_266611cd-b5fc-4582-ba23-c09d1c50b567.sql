
-- =========================================
-- AD FRAMEWORKS BUILDER
-- =========================================

-- Helper: check if user has any agency-level system role
CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'manager', 'media_buyer', 'closer', 'setter')
  )
$$;

-- Helper: check if user can manage frameworks (create/delete)
CREATE OR REPLACE FUNCTION public.can_manage_ad_frameworks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'manager')
  )
$$;

-- =========================================
-- TABLE: ad_frameworks
-- =========================================
CREATE TABLE public.ad_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view ad frameworks"
  ON public.ad_frameworks FOR SELECT
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Managers can insert ad frameworks"
  ON public.ad_frameworks FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_ad_frameworks(auth.uid()));

CREATE POLICY "Agency members can update ad frameworks"
  ON public.ad_frameworks FOR UPDATE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Managers can delete ad frameworks"
  ON public.ad_frameworks FOR DELETE
  TO authenticated
  USING (public.can_manage_ad_frameworks(auth.uid()));

CREATE TRIGGER trg_ad_frameworks_updated_at
  BEFORE UPDATE ON public.ad_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- TABLE: ad_framework_dimensions
-- =========================================
CREATE TABLE public.ad_framework_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.ad_frameworks(id) ON DELETE CASCADE,
  dimension_type text NOT NULL CHECK (dimension_type IN ('angle', 'format', 'hook')),
  label text NOT NULL,
  description text,
  color text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_framework_dimensions_framework
  ON public.ad_framework_dimensions(framework_id, dimension_type, position);

ALTER TABLE public.ad_framework_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view dimensions"
  ON public.ad_framework_dimensions FOR SELECT
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can insert dimensions"
  ON public.ad_framework_dimensions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can update dimensions"
  ON public.ad_framework_dimensions FOR UPDATE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can delete dimensions"
  ON public.ad_framework_dimensions FOR DELETE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE TRIGGER trg_ad_framework_dimensions_updated_at
  BEFORE UPDATE ON public.ad_framework_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- TABLE: ad_campaigns
-- =========================================
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.ad_frameworks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  client_id uuid,
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_framework ON public.ad_campaigns(framework_id);
CREATE INDEX idx_ad_campaigns_client ON public.ad_campaigns(client_id) WHERE client_id IS NOT NULL;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view campaigns"
  ON public.ad_campaigns FOR SELECT
  TO authenticated
  USING (
    public.is_agency_member(auth.uid())
    OR (client_id IS NOT NULL AND public.has_client_access(auth.uid(), client_id))
  );

CREATE POLICY "Managers can insert campaigns"
  ON public.ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_ad_frameworks(auth.uid()));

CREATE POLICY "Agency members can update campaigns"
  ON public.ad_campaigns FOR UPDATE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Managers can delete campaigns"
  ON public.ad_campaigns FOR DELETE
  TO authenticated
  USING (public.can_manage_ad_frameworks(auth.uid()));

CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- TABLE: ad_variants
-- =========================================
CREATE TABLE public.ad_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  angle_id uuid NOT NULL REFERENCES public.ad_framework_dimensions(id) ON DELETE CASCADE,
  format_id uuid NOT NULL REFERENCES public.ad_framework_dimensions(id) ON DELETE CASCADE,
  hook_id uuid NOT NULL REFERENCES public.ad_framework_dimensions(id) ON DELETE CASCADE,
  hook_text text,
  script text,
  copy text,
  cta text,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready', 'published')),
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, angle_id, format_id, hook_id)
);

CREATE INDEX idx_ad_variants_campaign ON public.ad_variants(campaign_id);
CREATE INDEX idx_ad_variants_status ON public.ad_variants(campaign_id, status);

ALTER TABLE public.ad_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view variants"
  ON public.ad_variants FOR SELECT
  TO authenticated
  USING (
    public.is_agency_member(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ad_campaigns c
      WHERE c.id = ad_variants.campaign_id
        AND c.client_id IS NOT NULL
        AND public.has_client_access(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Agency members can insert variants"
  ON public.ad_variants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can update variants"
  ON public.ad_variants FOR UPDATE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can delete variants"
  ON public.ad_variants FOR DELETE
  TO authenticated
  USING (public.is_agency_member(auth.uid()));

CREATE TRIGGER trg_ad_variants_updated_at
  BEFORE UPDATE ON public.ad_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- FUNCTION: generate_ad_variants
-- Generates the cartesian product of dimensions for a campaign
-- =========================================
CREATE OR REPLACE FUNCTION public.generate_ad_variants(_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_framework_id uuid;
  v_inserted integer;
BEGIN
  SELECT framework_id INTO v_framework_id
  FROM public.ad_campaigns
  WHERE id = _campaign_id;

  IF v_framework_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.ad_variants (campaign_id, angle_id, format_id, hook_id, status)
  SELECT _campaign_id, a.id, f.id, h.id, 'draft'
  FROM public.ad_framework_dimensions a
  CROSS JOIN public.ad_framework_dimensions f
  CROSS JOIN public.ad_framework_dimensions h
  WHERE a.framework_id = v_framework_id AND a.dimension_type = 'angle'
    AND f.framework_id = v_framework_id AND f.dimension_type = 'format'
    AND h.framework_id = v_framework_id AND h.dimension_type = 'hook'
  ON CONFLICT (campaign_id, angle_id, format_id, hook_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- Trigger: auto-generate variants on new campaign
CREATE OR REPLACE FUNCTION public.handle_new_ad_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generate_ad_variants(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ad_campaigns_generate_variants
  AFTER INSERT ON public.ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ad_campaign();

-- =========================================
-- SEED: Ad Framework v1
-- =========================================
DO $$
DECLARE
  v_framework_id uuid;
BEGIN
  INSERT INTO public.ad_frameworks (name, description)
  VALUES (
    'Ad Framework v1',
    '4 ángulos × 3 formatos × 3 hooks = 36 variantes por campaña'
  )
  RETURNING id INTO v_framework_id;

  -- Ángulos
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'angle', 'Dolores',         'Apela al dolor o problema actual del prospecto',                'hsl(0, 72%, 51%)',   0),
    (v_framework_id, 'angle', 'Transformación',  'Muestra el antes/después y la transformación posible',          'hsl(142, 71%, 45%)', 1),
    (v_framework_id, 'angle', 'Social Proof',    'Testimonios, casos de éxito y validación de terceros',          'hsl(217, 91%, 60%)', 2),
    (v_framework_id, 'angle', 'Autoridad',       'Credenciales, expertise y trayectoria del fundador/marca',      'hsl(262, 83%, 58%)', 3);

  -- Formatos
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'format', 'Founder', 'Founder hablando a cámara, primera persona, autoridad personal', NULL, 0),
    (v_framework_id, 'format', 'UGC',     'Estilo cliente real / testimonio orgánico generado por usuario',  NULL, 1),
    (v_framework_id, 'format', 'Demo',    'Demostración del producto/servicio en acción',                    NULL, 2);

  -- Hooks
  INSERT INTO public.ad_framework_dimensions (framework_id, dimension_type, label, description, color, position) VALUES
    (v_framework_id, 'hook', 'Pregunta',          'Abre con una pregunta directa al espectador',     NULL, 0),
    (v_framework_id, 'hook', 'Estadística (dato)', 'Abre con un dato impactante o estadística',      NULL, 1),
    (v_framework_id, 'hook', 'Contrarian',        'Abre con una afirmación contraintuitiva o polémica', NULL, 2);
END $$;
