
-- 1. class_groups
CREATE TABLE public.class_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  age_range_min integer,
  age_range_max integer,
  english_level text,
  teacher_id uuid REFERENCES public.client_teachers(id) ON DELETE SET NULL,
  classroom text,
  schedules jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage class groups" ON public.class_groups FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view class groups" ON public.class_groups FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert class groups" ON public.class_groups FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update class groups" ON public.class_groups FOR UPDATE TO authenticated
  USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can delete class groups" ON public.class_groups FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_class_groups_updated_at BEFORE UPDATE ON public.class_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. class_group_members
CREATE TABLE public.class_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_contact_id uuid NOT NULL REFERENCES public.student_contacts(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.message_sales(id) ON DELETE SET NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'
);

ALTER TABLE public.class_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group members" ON public.class_group_members FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view group members" ON public.class_group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_groups g WHERE g.id = class_group_members.group_id AND has_client_access(auth.uid(), g.client_id)));
CREATE POLICY "Team members can insert group members" ON public.class_group_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.class_groups g WHERE g.id = class_group_members.group_id AND has_client_access(auth.uid(), g.client_id)));
CREATE POLICY "Team members can update group members" ON public.class_group_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_groups g WHERE g.id = class_group_members.group_id AND has_client_access(auth.uid(), g.client_id)));
CREATE POLICY "Team members can delete group members" ON public.class_group_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_groups g WHERE g.id = class_group_members.group_id AND has_client_access(auth.uid(), g.client_id)));

-- 3. attendance_records
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  student_contact_id uuid NOT NULL REFERENCES public.student_contacts(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.class_groups(id) ON DELETE SET NULL,
  class_date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  notes text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.attendance_records FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view attendance" ON public.attendance_records FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert attendance" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update attendance" ON public.attendance_records FOR UPDATE TO authenticated
  USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can delete attendance" ON public.attendance_records FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

-- 4. Add group_id to message_sales
ALTER TABLE public.message_sales ADD COLUMN group_id uuid REFERENCES public.class_groups(id) ON DELETE SET NULL;
