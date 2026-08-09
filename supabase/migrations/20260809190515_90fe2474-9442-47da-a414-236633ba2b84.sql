CREATE OR REPLACE FUNCTION public.sync_landing_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  a jsonb := COALESCE(NEW.answers, '{}'::jsonb);
  slug text;
  v_notes text;
  v_existing uuid;
  v_status public.agency_crm_status;
BEGIN
  slug := COALESCE(a->>'landing_slug',
                   CASE WHEN a->>'source' LIKE 'landing:%' THEN split_part(a->>'source', ':', 2) END);
  IF slug IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := CASE
    WHEN COALESCE(a->>'estado','') IN ('no_calificado','bajo_presupuesto','bajo_volumen','contacto_sin_calificar')
      OR COALESCE(a->>'parcial','') = 'true'
      THEN 'no_calificado'::public.agency_crm_status
    ELSE 'nuevo'::public.agency_crm_status
  END;

  v_notes := 'Lead desde landing /lp/' || slug;
  IF COALESCE(a->>'parcial','') = 'true' THEN
    v_notes := v_notes || ' (solo contacto)';
  END IF;
  IF COALESCE(a->>'empresa','')       <> '' THEN v_notes := v_notes || E'\nEmpresa: '      || (a->>'empresa'); END IF;
  IF COALESCE(a->>'sector','')        <> '' THEN v_notes := v_notes || E'\nSector: '       || (a->>'sector'); END IF;
  IF COALESCE(a->>'facturacion','')   <> '' THEN v_notes := v_notes || E'\nFacturación: '  || (a->>'facturacion'); END IF;
  IF COALESCE(a->>'pauta_mensual','') <> '' THEN v_notes := v_notes || E'\nPauta: '        || (a->>'pauta_mensual'); END IF;
  IF COALESCE(a->>'presupuesto','')   <> '' THEN v_notes := v_notes || E'\nPresupuesto: ' || (a->>'presupuesto'); END IF;
  IF COALESCE(a->>'urgencia','')      <> '' THEN v_notes := v_notes || E'\nUrgencia: '    || (a->>'urgencia'); END IF;
  IF COALESCE(a->>'estado','')        <> '' THEN v_notes := v_notes || E'\nEstado form: ' || (a->>'estado'); END IF;
  IF COALESCE(NEW.challenge, a->>'reto_90_dias', a->>'goal_90d', '') <> '' THEN
    v_notes := v_notes || E'\nReto/Meta: ' || COALESCE(NEW.challenge, a->>'reto_90_dias', a->>'goal_90d');
  END IF;

  SELECT id INTO v_existing
  FROM public.agency_crm_leads
  WHERE (NEW.email IS NOT NULL AND NEW.email <> '' AND lower(email) = lower(NEW.email))
     OR (NEW.phone IS NOT NULL AND NEW.phone <> '' AND phone = NEW.phone)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.agency_crm_leads
    SET notes = v_notes,
        status = v_status,
        name  = COALESCE(NULLIF(btrim(NEW.name), ''), name),
        phone = COALESCE(NULLIF(btrim(NEW.phone), ''), phone),
        email = COALESCE(NULLIF(btrim(NEW.email), ''), email)
    WHERE id = v_existing
      AND status IN ('nuevo', 'no_calificado');
    RETURN NEW;
  END IF;

  INSERT INTO public.agency_crm_leads (name, email, phone, status, notes)
  VALUES (
    COALESCE(NULLIF(btrim(NEW.name), ''), 'Lead landing'),
    NULLIF(btrim(NEW.email), ''),
    NULLIF(btrim(NEW.phone), ''),
    v_status,
    v_notes
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_landing_lead_to_crm failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;