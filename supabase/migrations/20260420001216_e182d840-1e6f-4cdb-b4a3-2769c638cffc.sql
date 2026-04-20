-- ============================================================
-- COMMISSIONS SYSTEM
-- ============================================================

-- Main commissions table
CREATE TABLE public.closer_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.message_sales(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  closer_user_id UUID NULL,                    -- profile id (if team member)
  closer_manual_id UUID NULL,                  -- client_closers.id (named closer)
  closer_name TEXT NOT NULL,                   -- snapshot of name
  sale_total NUMERIC NOT NULL,                 -- total sale amount snapshot
  currency TEXT NOT NULL DEFAULT 'USD',
  base_rate NUMERIC NOT NULL DEFAULT 10,       -- percent (10 = 10%)
  payment_method TEXT NULL,                    -- snapshot
  method_adjustment NUMERIC NOT NULL DEFAULT 0, -- percent points subtracted (5 / 2 / 0)
  effective_rate NUMERIC NOT NULL,             -- base_rate - method_adjustment
  full_payment_bonus BOOLEAN NOT NULL DEFAULT FALSE, -- true if $3400 single payment
  total_commission NUMERIC NOT NULL,           -- effective_rate% over sale_total
  earned_amount NUMERIC NOT NULL DEFAULT 0,    -- proportional to cash collected
  paid_amount NUMERIC NOT NULL DEFAULT 0,      -- amount already paid out to closer
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | partial | paid
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT closer_commissions_one_closer CHECK (
    (closer_user_id IS NOT NULL)::int + (closer_manual_id IS NOT NULL)::int <= 1
  )
);

CREATE INDEX idx_closer_commissions_sale ON public.closer_commissions(sale_id);
CREATE INDEX idx_closer_commissions_client ON public.closer_commissions(client_id);
CREATE INDEX idx_closer_commissions_closer_user ON public.closer_commissions(closer_user_id);
CREATE INDEX idx_closer_commissions_status ON public.closer_commissions(status);

-- Payouts (each lump payment to a closer)
CREATE TABLE public.commission_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  closer_user_id UUID NULL,
  closer_manual_id UUID NULL,
  closer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NULL,                    -- transfer / stripe / cash / other
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_payouts_client ON public.commission_payouts(client_id);
CREATE INDEX idx_commission_payouts_closer_user ON public.commission_payouts(closer_user_id);
CREATE INDEX idx_commission_payouts_paid_at ON public.commission_payouts(paid_at);

-- Junction: payouts <-> commissions
CREATE TABLE public.commission_payout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID NOT NULL REFERENCES public.commission_payouts(id) ON DELETE CASCADE,
  commission_id UUID NOT NULL REFERENCES public.closer_commissions(id) ON DELETE CASCADE,
  amount_applied NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_payout_items_payout ON public.commission_payout_items(payout_id);
CREATE INDEX idx_commission_payout_items_commission ON public.commission_payout_items(commission_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.closer_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payout_items ENABLE ROW LEVEL SECURITY;

-- closer_commissions: only admins/owners and account managers
CREATE POLICY "Admins manage commissions"
  ON public.closer_commissions FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Account managers view commissions"
  ON public.closer_commissions FOR SELECT
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers insert commissions"
  ON public.closer_commissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers update commissions"
  ON public.closer_commissions FOR UPDATE
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers delete commissions"
  ON public.closer_commissions FOR DELETE
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

-- commission_payouts
CREATE POLICY "Admins manage payouts"
  ON public.commission_payouts FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Account managers view payouts"
  ON public.commission_payouts FOR SELECT
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers insert payouts"
  ON public.commission_payouts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_manager(auth.uid(), client_id) AND auth.uid() = created_by);

CREATE POLICY "Account managers update payouts"
  ON public.commission_payouts FOR UPDATE
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers delete payouts"
  ON public.commission_payouts FOR DELETE
  TO authenticated
  USING (public.is_account_manager(auth.uid(), client_id));

-- commission_payout_items (inherit from payout)
CREATE POLICY "Admins manage payout items"
  ON public.commission_payout_items FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Account managers view payout items"
  ON public.commission_payout_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.commission_payouts cp
    WHERE cp.id = commission_payout_items.payout_id
      AND public.is_account_manager(auth.uid(), cp.client_id)
  ));

CREATE POLICY "Account managers insert payout items"
  ON public.commission_payout_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.commission_payouts cp
    WHERE cp.id = commission_payout_items.payout_id
      AND public.is_account_manager(auth.uid(), cp.client_id)
  ));

CREATE POLICY "Account managers update payout items"
  ON public.commission_payout_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.commission_payouts cp
    WHERE cp.id = commission_payout_items.payout_id
      AND public.is_account_manager(auth.uid(), cp.client_id)
  ));

CREATE POLICY "Account managers delete payout items"
  ON public.commission_payout_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.commission_payouts cp
    WHERE cp.id = commission_payout_items.payout_id
      AND public.is_account_manager(auth.uid(), cp.client_id)
  ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE TRIGGER trg_closer_commissions_updated_at
  BEFORE UPDATE ON public.closer_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_commission_payouts_updated_at
  BEFORE UPDATE ON public.commission_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create commission for The Mind Coach sales
CREATE OR REPLACE FUNCTION public.create_commission_for_mindcoach_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Only for The Mind Coach
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  IF v_client_name IS NULL OR LOWER(v_client_name) NOT LIKE '%mind coach%' THEN
    RETURN NEW;
  END IF;

  -- Skip if no closer attribution
  IF NEW.closer_name IS NULL OR TRIM(NEW.closer_name) = '' THEN
    RETURN NEW;
  END IF;

  v_sale_total := COALESCE(NEW.total_sale_amount, NEW.amount, 0);
  IF v_sale_total <= 0 THEN
    RETURN NEW;
  END IF;

  -- Determine full payment bonus: $3400 USD, single payment (no installments or 1 installment)
  IF v_sale_total >= 3400 AND COALESCE(NEW.num_installments, 1) <= 1 THEN
    v_full_payment_bonus := TRUE;
  END IF;

  -- Method adjustment (skipped if full payment bonus)
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

  -- Try to resolve closer to user_id or manual closer
  SELECT id INTO v_closer_manual_id
  FROM public.client_closers
  WHERE client_id = NEW.client_id AND LOWER(name) = LOWER(NEW.closer_name)
  LIMIT 1;

  IF v_closer_manual_id IS NULL THEN
    SELECT p.id INTO v_closer_user_id
    FROM public.profiles p
    WHERE LOWER(COALESCE(p.full_name, p.email)) = LOWER(NEW.closer_name)
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
$$;

CREATE TRIGGER trg_create_commission_mindcoach
  AFTER INSERT ON public.message_sales
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_for_mindcoach_sale();

-- Update commission status based on paid_amount
CREATE OR REPLACE FUNCTION public.update_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_commission AND NEW.total_commission > 0 THEN
    NEW.status := 'paid';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_commission_status
  BEFORE UPDATE OF paid_amount, total_commission ON public.closer_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_commission_status();