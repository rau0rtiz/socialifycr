
CREATE OR REPLACE FUNCTION public.create_commission_for_mindcoach_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_base_rate NUMERIC := 10;
  v_method_adj NUMERIC := 0;
  v_effective_rate NUMERIC;
  v_sale_total NUMERIC;
  v_total_commission NUMERIC;
  v_full_payment_bonus BOOLEAN := FALSE;
  v_closer_manual_id UUID := NULL;
  v_closer_user_id UUID := NULL;
  v_method_lower TEXT;
BEGIN
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  IF v_client_name IS NULL OR LOWER(v_client_name) NOT LIKE '%mind coach%' THEN
    RETURN NEW;
  END IF;

  IF NEW.closer_name IS NULL OR TRIM(NEW.closer_name) = '' THEN
    RETURN NEW;
  END IF;

  v_sale_total := COALESCE(NEW.total_sale_amount, NEW.amount, 0);
  IF v_sale_total <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_sale_total >= 3400 AND COALESCE(NEW.num_installments, 1) <= 1 THEN
    v_full_payment_bonus := TRUE;
  END IF;

  v_method_lower := LOWER(COALESCE(NEW.payment_method, ''));
  IF NOT v_full_payment_bonus THEN
    IF v_method_lower LIKE '%stripe%' THEN
      v_method_adj := 5;
    ELSIF v_method_lower LIKE '%transfer%' OR v_method_lower LIKE '%transferencia%' THEN
      v_method_adj := 2;
    END IF;
  END IF;

  v_effective_rate := v_base_rate - v_method_adj;
  v_total_commission := ROUND(v_sale_total * v_effective_rate / 100.0, 2);

  -- Priorizar usuario real (team member con cuenta) sobre closer manual
  SELECT p.id INTO v_closer_user_id
  FROM public.client_team_members ctm
  JOIN public.profiles p ON p.id = ctm.user_id
  WHERE ctm.client_id = NEW.client_id
    AND ctm.role = 'closer'
    AND (LOWER(COALESCE(p.full_name, '')) = LOWER(NEW.closer_name)
         OR LOWER(COALESCE(p.email, '')) = LOWER(NEW.closer_name))
  LIMIT 1;

  IF v_closer_user_id IS NULL THEN
    SELECT id INTO v_closer_manual_id
    FROM public.client_closers
    WHERE client_id = NEW.client_id AND LOWER(name) = LOWER(NEW.closer_name)
    LIMIT 1;
  END IF;

  INSERT INTO public.closer_commissions (
    sale_id, client_id, closer_user_id, closer_manual_id, closer_name,
    sale_total, currency, base_rate, payment_method, method_adjustment,
    effective_rate, full_payment_bonus, total_commission
  ) VALUES (
    NEW.id, NEW.client_id, v_closer_user_id, v_closer_manual_id, NEW.closer_name,
    v_sale_total, COALESCE(NEW.currency, 'USD'), v_base_rate, NEW.payment_method, v_method_adj,
    v_effective_rate, v_full_payment_bonus, v_total_commission
  );

  RETURN NEW;
END;
$function$;
