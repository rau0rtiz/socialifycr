ALTER TABLE public.content_calendar_items ADD COLUMN IF NOT EXISTS clickup_list_id text, ADD COLUMN IF NOT EXISTS clickup_space_id text, ADD COLUMN IF NOT EXISTS clickup_sync_state text NOT NULL DEFAULT 'pending';
CREATE OR REPLACE FUNCTION public.claim_calendar_clickup_sync(p_item_id uuid, p_client_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.content_calendar_items SET clickup_sync_state = 'syncing' WHERE id = p_item_id AND client_id = p_client_id AND clickup_task_id IS NULL AND clickup_sync_state IN ('pending', 'failed');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_calendar_clickup_sync(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_calendar_clickup_sync(uuid, uuid) TO service_role;