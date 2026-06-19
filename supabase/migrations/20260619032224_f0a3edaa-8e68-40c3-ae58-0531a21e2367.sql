ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS public_share_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_production_sheets_share_token
  ON public.production_sheets(public_share_token)
  WHERE public_share_enabled = true;

CREATE OR REPLACE FUNCTION public.get_public_production_sheet(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet RECORD;
  v_client RECORD;
  v_team jsonb;
  v_shots jsonb;
  v_wardrobe jsonb;
BEGIN
  SELECT * INTO v_sheet
  FROM public.production_sheets
  WHERE public_share_token = _token
    AND public_share_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id, name, logo_url, primary_color
  INTO v_client
  FROM public.clients
  WHERE id = v_sheet.client_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.sort_order), '[]'::jsonb)
  INTO v_team
  FROM public.production_sheet_team t
  WHERE t.sheet_id = v_sheet.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s.*) ORDER BY s.sort_order), '[]'::jsonb)
  INTO v_shots
  FROM public.production_sheet_shots s
  WHERE s.sheet_id = v_sheet.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(w.*) ORDER BY w.sort_order), '[]'::jsonb)
  INTO v_wardrobe
  FROM public.production_sheet_wardrobe w
  WHERE w.sheet_id = v_sheet.id;

  RETURN jsonb_build_object(
    'sheet', jsonb_build_object(
      'id', v_sheet.id,
      'title', v_sheet.title,
      'shoot_date', v_sheet.shoot_date,
      'location', v_sheet.location,
      'call_time', v_sheet.call_time,
      'producer_name', v_sheet.producer_name,
      'status', v_sheet.status,
      'notes', v_sheet.notes,
      'updated_at', v_sheet.updated_at
    ),
    'client', to_jsonb(v_client),
    'team', v_team,
    'shots', v_shots,
    'wardrobe', v_wardrobe
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_production_sheet(uuid) TO anon, authenticated;