
ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.client_feature_flags ADD COLUMN monthly_sales_report boolean NOT NULL DEFAULT false;
