
CREATE TYPE public.production_sheet_status AS ENUM ('draft','in_production','done','sent_to_clickup');

CREATE TABLE public.production_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva producción',
  shoot_date DATE,
  location TEXT,
  call_time TEXT,
  producer_name TEXT,
  status public.production_sheet_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  clickup_task_id TEXT,
  clickup_list_id TEXT,
  clickup_url TEXT,
  sent_to_clickup_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sheets TO authenticated;
GRANT ALL ON public.production_sheets TO service_role;
ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_all_sheets" ON public.production_sheets FOR ALL
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER trg_prod_sheets_updated BEFORE UPDATE ON public.production_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_prod_sheets_client ON public.production_sheets(client_id);

CREATE TABLE public.production_sheet_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  clickup_user_email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sheet_team TO authenticated;
GRANT ALL ON public.production_sheet_team TO service_role;
ALTER TABLE public.production_sheet_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_all_team" ON public.production_sheet_team FOR ALL
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE INDEX idx_pst_sheet ON public.production_sheet_team(sheet_id);

CREATE TABLE public.production_sheet_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  scene_label TEXT,
  shot_number TEXT,
  description TEXT NOT NULL DEFAULT '',
  shot_type TEXT,
  duration_estimate TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sheet_shots TO authenticated;
GRANT ALL ON public.production_sheet_shots TO service_role;
ALTER TABLE public.production_sheet_shots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_all_shots" ON public.production_sheet_shots FOR ALL
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE INDEX idx_pss_sheet ON public.production_sheet_shots(sheet_id);

CREATE TABLE public.production_sheet_wardrobe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  item TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_sheet_wardrobe TO authenticated;
GRANT ALL ON public.production_sheet_wardrobe TO service_role;
ALTER TABLE public.production_sheet_wardrobe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_all_wardrobe" ON public.production_sheet_wardrobe FOR ALL
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE INDEX idx_psw_sheet ON public.production_sheet_wardrobe(sheet_id);

CREATE TABLE public.client_clickup_config (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id TEXT,
  workspace_name TEXT,
  space_id TEXT,
  space_name TEXT,
  list_id TEXT,
  list_name TEXT,
  default_assignee_emails TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_clickup_config TO authenticated;
GRANT ALL ON public.client_clickup_config TO service_role;
ALTER TABLE public.client_clickup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_all_clickup_cfg" ON public.client_clickup_config FOR ALL
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER trg_clickup_cfg_updated BEFORE UPDATE ON public.client_clickup_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
