
-- 1. Create student_contacts table
CREATE TABLE public.student_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  id_number text,
  age integer,
  gender text,
  notes text,
  guardian_name text,
  guardian_phone text,
  guardian_id_number text,
  guardian_email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student contacts" ON public.student_contacts FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view student contacts" ON public.student_contacts FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert student contacts" ON public.student_contacts FOR INSERT TO authenticated WITH CHECK (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update student contacts" ON public.student_contacts FOR UPDATE TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can delete student contacts" ON public.student_contacts FOR DELETE TO authenticated USING (has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_student_contacts_updated_at BEFORE UPDATE ON public.student_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Create client_teachers table
CREATE TABLE public.client_teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  available_schedules jsonb DEFAULT '[]'::jsonb,
  product_ids uuid[] DEFAULT '{}',
  audience_types text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teachers" ON public.client_teachers FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view teachers" ON public.client_teachers FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert teachers" ON public.client_teachers FOR INSERT TO authenticated WITH CHECK (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update teachers" ON public.client_teachers FOR UPDATE TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can delete teachers" ON public.client_teachers FOR DELETE TO authenticated USING (has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_client_teachers_updated_at BEFORE UPDATE ON public.client_teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Alter client_products - add category, audience, recurring, frequency, schedules, tax
ALTER TABLE public.client_products
  ADD COLUMN category text,
  ADD COLUMN audience text DEFAULT 'all',
  ADD COLUMN is_recurring boolean DEFAULT false,
  ADD COLUMN class_frequency jsonb,
  ADD COLUMN available_schedules jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN tax_applicable boolean DEFAULT false,
  ADD COLUMN tax_rate numeric DEFAULT 13;

-- 4. Alter message_sales - add student, teacher, schedule, discount, tax, payment_day
ALTER TABLE public.message_sales
  ADD COLUMN student_contact_id uuid REFERENCES public.student_contacts(id),
  ADD COLUMN teacher_id uuid REFERENCES public.client_teachers(id),
  ADD COLUMN assigned_schedule jsonb,
  ADD COLUMN discount_amount numeric DEFAULT 0,
  ADD COLUMN discount_reason text,
  ADD COLUMN tax_amount numeric DEFAULT 0,
  ADD COLUMN subtotal numeric,
  ADD COLUMN payment_day integer;
