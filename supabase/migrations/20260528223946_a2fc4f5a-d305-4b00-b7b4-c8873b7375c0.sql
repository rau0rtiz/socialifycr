
-- 1. Extender agency_contracts
ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS seller_name TEXT DEFAULT 'Lucía',
  ADD COLUMN IF NOT EXISTS commission_rate_initial NUMERIC(5,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS commission_rate_perpetual NUMERIC(5,2) DEFAULT 8,
  ADD COLUMN IF NOT EXISTS commission_initial_months INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS crm_lead_id UUID REFERENCES public.agency_crm_leads(id) ON DELETE SET NULL;

-- 2. Cronogramas de pago
CREATE TABLE IF NOT EXISTS public.agency_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.agency_contracts(id) ON DELETE CASCADE,
  payments_per_month INTEGER NOT NULL DEFAULT 1,
  payment_days INTEGER[] NOT NULL DEFAULT ARRAY[1],
  amount_per_payment NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_payment_schedules TO authenticated;
GRANT ALL ON public.agency_payment_schedules TO service_role;

ALTER TABLE public.agency_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage payment schedules"
ON public.agency_payment_schedules
FOR ALL
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

-- 3. Extender agency_collections con datos de comisión
ALTER TABLE public.agency_collections
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.agency_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_month INTEGER,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- 4. Función que calcula la comisión al cambiar a paid
CREATE OR REPLACE FUNCTION public.calc_collection_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_paid_date DATE;
  v_months_diff INTEGER;
  v_service_month INTEGER;
  v_rate NUMERIC;
BEGIN
  -- Solo calcular cuando pasa a 'paid'
  IF NEW.status IS DISTINCT FROM 'paid' THEN
    NEW.service_month := NULL;
    NEW.commission_rate := NULL;
    NEW.commission_amount := NULL;
    RETURN NEW;
  END IF;

  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_contract FROM public.agency_contracts WHERE id = NEW.contract_id;
  IF NOT FOUND OR v_contract.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_paid_date := COALESCE(NEW.paid_at::DATE, CURRENT_DATE);

  -- mes de servicio = meses calendario entre start_date y paid_at + 1
  v_months_diff := (EXTRACT(YEAR FROM AGE(v_paid_date, v_contract.start_date)) * 12
                   + EXTRACT(MONTH FROM AGE(v_paid_date, v_contract.start_date)))::INTEGER;
  v_service_month := GREATEST(1, v_months_diff + 1);

  IF v_service_month <= COALESCE(v_contract.commission_initial_months, 3) THEN
    v_rate := COALESCE(v_contract.commission_rate_initial, 15);
  ELSE
    v_rate := COALESCE(v_contract.commission_rate_perpetual, 8);
  END IF;

  NEW.service_month := v_service_month;
  NEW.commission_rate := v_rate;
  NEW.commission_amount := ROUND(COALESCE(NEW.paid_amount, NEW.amount, 0) * v_rate / 100.0, 2);
  NEW.seller_name := COALESCE(NEW.seller_name, v_contract.seller_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_collection_commission ON public.agency_collections;
CREATE TRIGGER trg_calc_collection_commission
BEFORE INSERT OR UPDATE OF status, paid_at, paid_amount, contract_id
ON public.agency_collections
FOR EACH ROW
EXECUTE FUNCTION public.calc_collection_commission();

-- 5. Cancelar cuotas pendientes cuando se cancela el contrato
CREATE OR REPLACE FUNCTION public.cancel_pending_collections_on_churn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('churned', 'cancelled', 'discontinued')
     AND OLD.status NOT IN ('churned', 'cancelled', 'discontinued') THEN
    UPDATE public.agency_collections
    SET status = 'cancelled', updated_at = now()
    WHERE contract_id = NEW.id
      AND status = 'pending'
      AND due_date >= CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_pending_collections ON public.agency_contracts;
CREATE TRIGGER trg_cancel_pending_collections
AFTER UPDATE OF status ON public.agency_contracts
FOR EACH ROW
EXECUTE FUNCTION public.cancel_pending_collections_on_churn();

-- 6. Pagos de comisión a vendedores
CREATE TABLE IF NOT EXISTS public.agency_commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_commission NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_commission_payouts TO authenticated;
GRANT ALL ON public.agency_commission_payouts TO service_role;

ALTER TABLE public.agency_commission_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage commission payouts"
ON public.agency_commission_payouts
FOR ALL
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

-- 7. Index para performance
CREATE INDEX IF NOT EXISTS idx_agency_collections_contract ON public.agency_collections(contract_id);
CREATE INDEX IF NOT EXISTS idx_agency_collections_seller ON public.agency_collections(seller_name);
CREATE INDEX IF NOT EXISTS idx_agency_collections_paid_at ON public.agency_collections(paid_at);
CREATE INDEX IF NOT EXISTS idx_agency_payment_schedules_contract ON public.agency_payment_schedules(contract_id);
