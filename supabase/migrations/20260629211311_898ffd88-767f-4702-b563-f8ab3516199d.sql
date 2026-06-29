
CREATE OR REPLACE FUNCTION public.auto_assign_instant_form_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sellers uuid[];
  v_count integer;
  v_idx integer;
  v_seller uuid;
BEGIN
  IF NEW.assigned_seller_id IS NOT NULL THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    RETURN NEW;
  END IF;

  -- Build deterministic seller list for this client.
  -- A user is a "vendedor" if their client_team_members.role is setter/closer
  -- OR they have a system user_roles.role of setter/closer.
  SELECT COALESCE(array_agg(DISTINCT ctm.user_id ORDER BY ctm.user_id), ARRAY[]::uuid[])
  INTO v_sellers
  FROM public.client_team_members ctm
  LEFT JOIN public.user_roles ur ON ur.user_id = ctm.user_id
  WHERE ctm.client_id = NEW.client_id
    AND (
      ctm.role IN ('setter','closer')
      OR ur.role IN ('setter','closer')
    );

  IF array_length(v_sellers, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.instant_form_leads
  WHERE client_id = NEW.client_id
    AND assigned_seller_id = ANY(v_sellers);

  v_idx := (v_count % array_length(v_sellers, 1)) + 1;
  v_seller := v_sellers[v_idx];

  NEW.assigned_seller_id := v_seller;
  NEW.assigned_at := now();

  RETURN NEW;
END;
$function$;
