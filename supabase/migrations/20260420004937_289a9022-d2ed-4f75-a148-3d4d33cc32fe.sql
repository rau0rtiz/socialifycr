CREATE OR REPLACE FUNCTION public.sync_mindcoach_commission_from_sale_id(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale RECORD;
  v_client_name TEXT;
  v_base_rate NUMERIC := 10;
  v_method_adj NUMERIC := 0;
  v_effective_rate NUMERIC;
  v_sale_total NUMERIC;
  v_total_commission NUMERIC;
  v_closer_manual_id UUID := NULL;
  v_closer_user_id UUID := NULL;
  v_method_lower TEXT;
BEGIN
  SELECT * INTO v_sale
  FROM public.message_sales
  WHERE id = _sale_id;

  IF NOT FOUND THEN
    DELETE FROM public.closer_commissions WHERE sale_id = _sale_id;
    RETURN;
  END IF;

  SELECT name INTO v_client_name FROM public.clients WHERE id = v_sale.client_id;
  IF v_client_name IS NULL OR LOWER(v_client_name) NOT LIKE '%mind coach%' THEN
    DELETE FROM public.closer_commissions WHERE sale_id = _sale_id;
    RETURN;
  END IF;

  IF v_sale.closer_name IS NULL OR TRIM(v_sale.closer_name) = '' THEN
    DELETE FROM public.closer_commissions WHERE sale_id = _sale_id;
    RETURN;
  END IF;

  v_sale_total := COALESCE(v_sale.total_sale_amount, v_sale.amount, 0);
  IF v_sale_total <= 0 THEN
    DELETE FROM public.closer_commissions WHERE sale_id = _sale_id;
    RETURN;
  END IF;

  v_method_lower := LOWER(COALESCE(v_sale.payment_method, ''));
  IF v_method_lower LIKE '%stripe%' THEN
    v_method_adj := 5;
  ELSIF v_method_lower LIKE '%transfer%' OR v_method_lower LIKE '%transferencia%' THEN
    v_method_adj := 2;
  ELSE
    v_method_adj := 0;
  END IF;

  v_effective_rate := v_base_rate - v_method_adj;
  v_total_commission := ROUND(v_sale_total * v_effective_rate / 100.0, 2);

  SELECT p.id INTO v_closer_user_id
  FROM public.client_team_members ctm
  JOIN public.profiles p ON p.id = ctm.user_id
  WHERE ctm.client_id = v_sale.client_id
    AND ctm.role = 'closer'
    AND (
      LOWER(COALESCE(p.full_name, '')) = LOWER(v_sale.closer_name)
      OR LOWER(COALESCE(p.email, '')) = LOWER(v_sale.closer_name)
    )
  LIMIT 1;

  IF v_closer_user_id IS NULL THEN
    SELECT id INTO v_closer_manual_id
    FROM public.client_closers
    WHERE client_id = v_sale.client_id
      AND LOWER(name) = LOWER(v_sale.closer_name)
    LIMIT 1;
  END IF;

  INSERT INTO public.closer_commissions (
    sale_id,
    client_id,
    closer_user_id,
    closer_manual_id,
    closer_name,
    sale_total,
    currency,
    base_rate,
    payment_method,
    method_adjustment,
    effective_rate,
    full_payment_bonus,
    total_commission
  ) VALUES (
    v_sale.id,
    v_sale.client_id,
    v_closer_user_id,
    v_closer_manual_id,
    v_sale.closer_name,
    v_sale_total,
    COALESCE(v_sale.currency, 'USD'),
    v_base_rate,
    v_sale.payment_method,
    v_method_adj,
    v_effective_rate,
    FALSE,
    v_total_commission
  )
  ON CONFLICT (sale_id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    closer_user_id = EXCLUDED.closer_user_id,
    closer_manual_id = EXCLUDED.closer_manual_id,
    closer_name = EXCLUDED.closer_name,
    sale_total = EXCLUDED.sale_total,
    currency = EXCLUDED.currency,
    base_rate = EXCLUDED.base_rate,
    payment_method = EXCLUDED.payment_method,
    method_adjustment = EXCLUDED.method_adjustment,
    effective_rate = EXCLUDED.effective_rate,
    full_payment_bonus = EXCLUDED.full_payment_bonus,
    total_commission = EXCLUDED.total_commission,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_commission_for_mindcoach_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_mindcoach_commission_from_sale_id(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_commission_for_mindcoach_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_mindcoach_commission_from_sale_id(NEW.id);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  sale_row RECORD;
BEGIN
  FOR sale_row IN
    SELECT ms.id
    FROM public.message_sales ms
    JOIN public.clients c ON c.id = ms.client_id
    WHERE LOWER(c.name) LIKE '%mind coach%'
  LOOP
    PERFORM public.sync_mindcoach_commission_from_sale_id(sale_row.id);
  END LOOP;
END;
$$;