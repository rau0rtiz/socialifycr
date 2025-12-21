-- Create a table for saved reports
CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_type TEXT,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Admins can manage reports"
ON public.saved_reports
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client reports"
ON public.saved_reports
FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can create reports for their clients"
ON public.saved_reports
FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete their own reports"
ON public.saved_reports
FOR DELETE
USING (has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_reports_updated_at
BEFORE UPDATE ON public.saved_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();