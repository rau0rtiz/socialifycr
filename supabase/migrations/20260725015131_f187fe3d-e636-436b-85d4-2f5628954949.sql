
-- 1) Re-scope policies from role 'public' to 'authenticated' on the listed tables.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND 'public' = ANY(roles)
      AND tablename IN (
        'video_ideas','content_metadata','content_tags','content_models',
        'campaign_goals','archived_stories','client_competitors',
        'ad_framework_references','ad_variants','launches',
        'launch_daily_reports','launch_phase_tasks','sale_order_items',
        'crosspost_links','client_invitations',
        'content_metadata_models','content_metadata_tags'
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated',
                   r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Allow admins/owners to read email_send_log via the API (fail-closed otherwise).
DROP POLICY IF EXISTS "Admins can view email send log" ON public.email_send_log;
CREATE POLICY "Admins can view email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.is_admin_or_higher(auth.uid()));
