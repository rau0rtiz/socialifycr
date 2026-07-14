
-- 1) agency_crm_leads: restrict view/update/delete to admins + managers only.
--    Keep INSERT open to any agency member (so setters/closers can log a lead
--    they personally captured), but they cannot browse or edit the CRM.
DROP POLICY IF EXISTS "Agency members can view CRM leads"   ON public.agency_crm_leads;
DROP POLICY IF EXISTS "Agency members can update CRM leads" ON public.agency_crm_leads;
DROP POLICY IF EXISTS "Agency members can delete CRM leads" ON public.agency_crm_leads;

CREATE POLICY "Admins and managers can view CRM leads"
  ON public.agency_crm_leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_higher(auth.uid())
    OR public.has_system_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update CRM leads"
  ON public.agency_crm_leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_higher(auth.uid())
    OR public.has_system_role(auth.uid(), 'manager')
  )
  WITH CHECK (
    public.is_admin_or_higher(auth.uid())
    OR public.has_system_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can delete CRM leads"
  ON public.agency_crm_leads
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_higher(auth.uid())
    OR public.has_system_role(auth.uid(), 'manager')
  );

-- 2) content-images bucket: add missing UPDATE policy mirroring INSERT/SELECT.
CREATE POLICY "client_content_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'content-images'
    AND (storage.foldername(name))[1] <> 'avatars'
    AND (storage.foldername(name))[1] <> 'imgdb'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'content-images'
    AND (storage.foldername(name))[1] <> 'avatars'
    AND (storage.foldername(name))[1] <> 'imgdb'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 3) funnel_leads: keep public insert but add basic validation via trigger
--    (avoids CHECK constraints that can be brittle on future changes).
CREATE OR REPLACE FUNCTION public.validate_funnel_lead()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Length limits
  IF NEW.name IS NOT NULL AND char_length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'name exceeds maximum length (200)';
  END IF;
  IF NEW.email IS NOT NULL AND char_length(NEW.email) > 320 THEN
    RAISE EXCEPTION 'email exceeds maximum length (320)';
  END IF;
  IF NEW.phone IS NOT NULL AND char_length(NEW.phone) > 40 THEN
    RAISE EXCEPTION 'phone exceeds maximum length (40)';
  END IF;

  -- Trim whitespace
  IF NEW.name  IS NOT NULL THEN NEW.name  := btrim(NEW.name);  END IF;
  IF NEW.email IS NOT NULL THEN NEW.email := btrim(NEW.email); END IF;
  IF NEW.phone IS NOT NULL THEN NEW.phone := btrim(NEW.phone); END IF;

  -- Basic email format check when provided
  IF NEW.email IS NOT NULL AND NEW.email <> ''
     AND NEW.email !~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'email format is invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funnel_leads_validate ON public.funnel_leads;
CREATE TRIGGER funnel_leads_validate
  BEFORE INSERT OR UPDATE ON public.funnel_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_funnel_lead();
