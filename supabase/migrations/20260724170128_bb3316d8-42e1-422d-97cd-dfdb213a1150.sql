
-- Clients billed recurrently
CREATE TABLE public.agency_payment_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_payment_clients TO authenticated;
GRANT ALL ON public.agency_payment_clients TO service_role;
ALTER TABLE public.agency_payment_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_pay_clients_all"
  ON public.agency_payment_clients FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

-- Recurring dates for each client (day-of-month 1..31)
CREATE TABLE public.agency_payment_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.agency_payment_clients(id) ON DELETE CASCADE,
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  label TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agency_pay_dates_client ON public.agency_payment_dates(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_payment_dates TO authenticated;
GRANT ALL ON public.agency_payment_dates TO service_role;
ALTER TABLE public.agency_payment_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_pay_dates_all"
  ON public.agency_payment_dates FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

-- Actual payments per period
CREATE TABLE public.agency_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.agency_payment_clients(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.agency_payment_dates(id) ON DELETE SET NULL,
  period DATE NOT NULL,      -- first day of the month, e.g. 2026-07-01
  due_date DATE NOT NULL,    -- computed due date (day clamped to month end)
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, schedule_id, period)
);
CREATE INDEX idx_agency_pay_records_period ON public.agency_payment_records(period);
CREATE INDEX idx_agency_pay_records_client ON public.agency_payment_records(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_payment_records TO authenticated;
GRANT ALL ON public.agency_payment_records TO service_role;
ALTER TABLE public.agency_payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_pay_records_all"
  ON public.agency_payment_records FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TRIGGER trg_agency_pay_clients_updated
  BEFORE UPDATE ON public.agency_payment_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_agency_pay_dates_updated
  BEFORE UPDATE ON public.agency_payment_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_agency_pay_records_updated
  BEFORE UPDATE ON public.agency_payment_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
