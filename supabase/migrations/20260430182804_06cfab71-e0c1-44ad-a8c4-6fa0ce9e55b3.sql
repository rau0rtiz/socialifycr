
CREATE OR REPLACE FUNCTION public.set_launch_phase_tasks_updated_at_fn()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.launch_phase_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.ad_framework_dimensions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_phase_tasks_campaign ON public.launch_phase_tasks(campaign_id);
CREATE INDEX idx_launch_phase_tasks_phase ON public.launch_phase_tasks(phase_id);

ALTER TABLE public.launch_phase_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View tasks for accessible campaigns"
ON public.launch_phase_tasks FOR SELECT
USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = launch_phase_tasks.campaign_id));

CREATE POLICY "Insert tasks for accessible campaigns"
ON public.launch_phase_tasks FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = launch_phase_tasks.campaign_id));

CREATE POLICY "Update tasks for accessible campaigns"
ON public.launch_phase_tasks FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = launch_phase_tasks.campaign_id));

CREATE POLICY "Delete tasks for accessible campaigns"
ON public.launch_phase_tasks FOR DELETE
USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = launch_phase_tasks.campaign_id));

CREATE TRIGGER set_launch_phase_tasks_updated_at
BEFORE UPDATE ON public.launch_phase_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_launch_phase_tasks_updated_at_fn();
