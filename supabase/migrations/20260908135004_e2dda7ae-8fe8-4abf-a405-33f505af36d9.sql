ALTER TABLE public.agency_payment_records
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'al_cobro';

UPDATE public.agency_payment_records SET status = 'pagado' WHERE paid = true;

CREATE TABLE IF NOT EXISTS public.agency_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_client_id uuid NOT NULL REFERENCES public.agency_payment_clients(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Principal',
  billing_name text,
  billing_tax_id text,
  billing_email text,
  billing_phone text,
  billing_address text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_billing_profiles TO authenticated;
GRANT ALL ON public.agency_billing_profiles TO service_role;

ALTER TABLE public.agency_billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_billing_profiles_all" ON public.agency_billing_profiles
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TRIGGER agency_billing_profiles_updated_at
  BEFORE UPDATE ON public.agency_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.agency_billing_profiles (payment_client_id, label, billing_name, billing_tax_id, billing_email, billing_phone, billing_address, is_default)
SELECT id, 'Principal', billing_name, billing_tax_id, billing_email, billing_phone, billing_address, true
FROM public.agency_payment_clients
WHERE coalesce(billing_name,'') <> '' OR coalesce(billing_tax_id,'') <> '' OR coalesce(billing_email,'') <> '';