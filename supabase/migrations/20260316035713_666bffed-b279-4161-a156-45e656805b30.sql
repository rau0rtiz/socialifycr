CREATE TABLE public.publication_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month date NOT NULL,
  target_posts integer NOT NULL DEFAULT 0,
  target_reach integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, month)
);

ALTER TABLE public.publication_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage publication goals"
  ON public.publication_goals FOR ALL
  TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view publication goals"
  ON public.publication_goals FOR SELECT
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert publication goals"
  ON public.publication_goals FOR INSERT
  TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update publication goals"
  ON public.publication_goals FOR UPDATE
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_publication_goals_updated_at
  BEFORE UPDATE ON public.publication_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();