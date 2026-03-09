
-- Payment provider enum
CREATE TYPE public.payment_provider AS ENUM ('tilopay', 'onvopay', 'bac_compra_click');

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled');

-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'expired', 'trialing');

-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CRC',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  features JSONB DEFAULT '[]'::jsonb,
  max_clients INTEGER,
  max_users INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client subscriptions table
CREATE TABLE public.client_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'active',
  payment_provider payment_provider,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  cancelled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Payment transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  provider_transaction_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CRC',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  provider_response JSONB,
  error_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Plans: everyone can read active plans, admins manage
CREATE POLICY "Anyone authenticated can view active plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Subscriptions: team members can view, admins manage
CREATE POLICY "Team members can view their client subscription"
  ON public.client_subscriptions FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage subscriptions"
  ON public.client_subscriptions FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Transactions: team members view, admins manage
CREATE POLICY "Team members can view their client transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage transactions"
  ON public.payment_transactions FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
