CREATE TABLE public.agency_billing_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage billing accounts" ON public.agency_billing_accounts
FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER update_agency_billing_accounts_updated_at BEFORE UPDATE ON public.agency_billing_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.agency_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  billing_account_id UUID REFERENCES public.agency_billing_accounts(id) ON DELETE SET NULL,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency TEXT NOT NULL DEFAULT 'monthly',
  posts_per_month INTEGER NOT NULL DEFAULT 0,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  churn_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT agency_contracts_status_check CHECK (status IN ('active','paused','churned')),
  CONSTRAINT agency_contracts_freq_check CHECK (billing_frequency IN ('monthly','quarterly','annual'))
);
CREATE INDEX idx_agency_contracts_client ON public.agency_contracts(client_id);
CREATE INDEX idx_agency_contracts_status ON public.agency_contracts(status);
CREATE INDEX idx_agency_contracts_billing_account ON public.agency_contracts(billing_account_id);
ALTER TABLE public.agency_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage contracts" ON public.agency_contracts
FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER update_agency_contracts_updated_at BEFORE UPDATE ON public.agency_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.agency_meta_connection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  business_id TEXT,
  user_name TEXT,
  user_meta_id TEXT,
  connected_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_meta_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage meta connection" ON public.agency_meta_connection
FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER update_agency_meta_connection_updated_at BEFORE UPDATE ON public.agency_meta_connection
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.agency_meta_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  client_id UUID,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_agency_meta_accounts_client ON public.agency_meta_accounts(client_id);
ALTER TABLE public.agency_meta_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage meta accounts" ON public.agency_meta_accounts
FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER update_agency_meta_accounts_updated_at BEFORE UPDATE ON public.agency_meta_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();