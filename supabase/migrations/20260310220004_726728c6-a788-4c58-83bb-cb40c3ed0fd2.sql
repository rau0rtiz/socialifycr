
CREATE TABLE public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  target_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales goals" ON public.sales_goals FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view sales goals" ON public.sales_goals FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update sales goals" ON public.sales_goals FOR UPDATE TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert sales goals" ON public.sales_goals FOR INSERT TO authenticated WITH CHECK (has_client_access(auth.uid(), client_id));
