CREATE OR REPLACE FUNCTION public.sync_mindcoach_commission_from_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
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
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  IF v_client_name IS NULL OR LOWER(v_client_name) NOT LIKE '%mind coach%' THEN
    RETURN NEW;
  END IF;

  IF NEW.closer_name IS NULL OR TRIM(NEW.closer_name) = '' THEN
    DELETE FROM public.closer_commissions WHERE sale_id = NEW.id;
    RETURN NEW;
  END IF;

  v_sale_total := COALESCE(NEW.total_sale_amount, NEW.amount, 0);
  IF v_sale_total <= 0 THEN
    DELETE FROM public.closer_commissions WHERE sale_id = NEW.id;
    RETURN NEW;
  END IF;

  v_method_lower := LOWER(COALESCE(NEW.payment_method, ''));
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
  WHERE ctm.client_id = NEW.client_id
    AND ctm.role = 'closer'
    AND (
      LOWER(COALESCE(p.full_name, '')) = LOWER(NEW.closer_name)
      OR LOWER(COALESCE(p.email, '')) = LOWER(NEW.closer_name)
    )
  LIMIT 1;

  IF v_closer_user_id IS NULL THEN
    SELECT id INTO v_closer_manual_id
    FROM public.client_closers
    WHERE client_id = NEW.client_id
      AND LOWER(name) = LOWER(NEW.closer_name)
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
    NEW.id,
    NEW.client_id,
    v_closer_user_id,
    v_closer_manual_id,
    NEW.closer_name,
    v_sale_total,
    COALESCE(NEW.currency, 'USD'),
    v_base_rate,
    NEW.payment_method,
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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_commission_for_mindcoach_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_mindcoach_commission_from_sale();
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
  PERFORM public.sync_mindcoach_commission_from_sale();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_commission_for_mindcoach_sale ON public.message_sales;
CREATE TRIGGER trg_create_commission_for_mindcoach_sale
AFTER INSERT ON public.message_sales
FOR EACH ROW
EXECUTE FUNCTION public.create_commission_for_mindcoach_sale();

DROP TRIGGER IF EXISTS trg_update_commission_for_mindcoach_sale ON public.message_sales;
CREATE TRIGGER trg_update_commission_for_mindcoach_sale
AFTER UPDATE OF closer_name, total_sale_amount, amount, currency, payment_method, client_id ON public.message_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_commission_for_mindcoach_sale();

CREATE UNIQUE INDEX IF NOT EXISTS idx_closer_commissions_sale_unique ON public.closer_commissions(sale_id);

UPDATE public.closer_commissions cc
SET
  closer_user_id = resolved.closer_user_id,
  closer_manual_id = resolved.closer_manual_id,
  closer_name = resolved.closer_name,
  sale_total = resolved.sale_total,
  currency = resolved.currency,
  base_rate = resolved.base_rate,
  payment_method = resolved.payment_method,
  method_adjustment = resolved.method_adjustment,
  effective_rate = resolved.effective_rate,
  full_payment_bonus = FALSE,
  total_commission = resolved.total_commission,
  updated_at = now()
FROM (
  SELECT
    cc_inner.id AS commission_id,
    ms.closer_name,
    COALESCE(ms.total_sale_amount, ms.amount, 0) AS sale_total,
    COALESCE(ms.currency, 'USD') AS currency,
    10::NUMERIC AS base_rate,
    ms.payment_method,
    CASE
      WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%stripe%' THEN 5
      WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%transfer%' OR LOWER(COALESCE(ms.payment_method, '')) LIKE '%transferencia%' THEN 2
      ELSE 0
    END::NUMERIC AS method_adjustment,
    (10 - CASE
      WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%stripe%' THEN 5
      WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%transfer%' OR LOWER(COALESCE(ms.payment_method, '')) LIKE '%transferencia%' THEN 2
      ELSE 0
    END)::NUMERIC AS effective_rate,
    ROUND(
      COALESCE(ms.total_sale_amount, ms.amount, 0)
      * (
        (10 - CASE
          WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%stripe%' THEN 5
          WHEN LOWER(COALESCE(ms.payment_method, '')) LIKE '%transfer%' OR LOWER(COALESCE(ms.payment_method, '')) LIKE '%transferencia%' THEN 2
          ELSE 0
        END)::NUMERIC
      ) / 100.0,
      2
    ) AS total_commission,
    (
      SELECT p.id
      FROM public.client_team_members ctm
      JOIN public.profiles p ON p.id = ctm.user_id
      WHERE ctm.client_id = ms.client_id
        AND ctm.role = 'closer'
        AND (
          LOWER(COALESCE(p.full_name, '')) = LOWER(ms.closer_name)
          OR LOWER(COALESCE(p.email, '')) = LOWER(ms.closer_name)
        )
      LIMIT 1
    ) AS closer_user_id,
    CASE
      WHEN (
        SELECT p.id
        FROM public.client_team_members ctm
        JOIN public.profiles p ON p.id = ctm.user_id
        WHERE ctm.client_id = ms.client_id
          AND ctm.role = 'closer'
          AND (
            LOWER(COALESCE(p.full_name, '')) = LOWER(ms.closer_name)
            OR LOWER(COALESCE(p.email, '')) = LOWER(ms.closer_name)
          )
        LIMIT 1
      ) IS NULL THEN (
        SELECT cl.id
        FROM public.client_closers cl
        WHERE cl.client_id = ms.client_id
          AND LOWER(cl.name) = LOWER(ms.closer_name)
        LIMIT 1
      )
      ELSE NULL
    END AS closer_manual_id
  FROM public.closer_commissions cc_inner
  JOIN public.message_sales ms ON ms.id = cc_inner.sale_id
  JOIN public.clients c ON c.id = ms.client_id
  WHERE LOWER(c.name) LIKE '%mind coach%'
) AS resolved
WHERE cc.id = resolved.commission_id;