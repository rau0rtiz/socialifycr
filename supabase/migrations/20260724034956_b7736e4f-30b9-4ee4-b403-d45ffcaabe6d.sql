
CREATE OR REPLACE FUNCTION public.create_agency_crm_lead_from_website_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_source text;
  v_notes text;
  v_brand text;
  v_goal text;
  v_challenge text;
  v_tried text;
  v_exists boolean;
BEGIN
  IF NEW.answers IS NULL THEN
    RETURN NEW;
  END IF;

  v_source := NEW.answers->>'source';
  IF v_source IS DISTINCT FROM 'website-contact-form' THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates: skip if a lead with same email or phone already exists
  IF (NEW.email IS NOT NULL AND NEW.email <> '') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.agency_crm_leads
      WHERE lower(email) = lower(NEW.email)
    ) INTO v_exists;
    IF v_exists THEN RETURN NEW; END IF;
  END IF;

  IF NOT COALESCE(v_exists, false) AND NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.agency_crm_leads
      WHERE phone = NEW.phone
    ) INTO v_exists;
    IF v_exists THEN RETURN NEW; END IF;
  END IF;

  v_brand     := COALESCE(NEW.answers->>'brand', NEW.industry, '');
  v_goal      := COALESCE(NEW.answers->>'goal_90d', '');
  v_challenge := COALESCE(NEW.challenge, NEW.answers->>'challenge', NEW.answers->>'looking_for', '');
  v_tried     := COALESCE(NEW.answers->>'tried', '');

  v_notes := 'Lead desde socialifycr.com';
  IF v_brand <> ''     THEN v_notes := v_notes || E'\nMarca/Negocio: ' || v_brand; END IF;
  IF v_goal <> ''      THEN v_notes := v_notes || E'\nMeta 90d: ' || v_goal; END IF;
  IF v_challenge <> '' THEN v_notes := v_notes || E'\nReto: ' || v_challenge; END IF;
  IF v_tried <> ''     THEN v_notes := v_notes || E'\nHa intentado: ' || v_tried; END IF;

  INSERT INTO public.agency_crm_leads (name, email, phone, status, notes)
  VALUES (
    COALESCE(NULLIF(btrim(NEW.name), ''), 'Contacto web'),
    NULLIF(btrim(NEW.email), ''),
    NULLIF(btrim(NEW.phone), ''),
    'nuevo',
    v_notes
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_agency_crm_lead_from_website_contact failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_funnel_lead_to_agency_crm ON public.funnel_leads;
CREATE TRIGGER trg_funnel_lead_to_agency_crm
AFTER INSERT ON public.funnel_leads
FOR EACH ROW EXECUTE FUNCTION public.create_agency_crm_lead_from_website_contact();
