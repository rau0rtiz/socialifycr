
DO $$
DECLARE
  v_client uuid := 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7';
  v_sellers uuid[];
  v_rec RECORD;
  v_idx integer := 0;
  v_n integer;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT ctm.user_id ORDER BY ctm.user_id), ARRAY[]::uuid[])
  INTO v_sellers
  FROM public.client_team_members ctm
  LEFT JOIN public.user_roles ur ON ur.user_id = ctm.user_id
  WHERE ctm.client_id = v_client
    AND (ctm.role IN ('setter','closer') OR ur.role IN ('setter','closer'));

  v_n := COALESCE(array_length(v_sellers, 1), 0);
  IF v_n = 0 THEN RETURN; END IF;

  ALTER TABLE public.instant_form_leads DISABLE TRIGGER USER;

  FOR v_rec IN
    SELECT id
    FROM public.instant_form_leads
    WHERE client_id = v_client
      AND message_sale_id IS NULL
      AND customer_contact_id IS NULL
      AND (lead_status IS NULL OR lead_status = 'new')
    ORDER BY created_time NULLS LAST, created_at
  LOOP
    UPDATE public.instant_form_leads
    SET assigned_seller_id = v_sellers[(v_idx % v_n) + 1],
        assigned_at = now()
    WHERE id = v_rec.id;
    v_idx := v_idx + 1;
  END LOOP;

  ALTER TABLE public.instant_form_leads ENABLE TRIGGER USER;
END $$;
