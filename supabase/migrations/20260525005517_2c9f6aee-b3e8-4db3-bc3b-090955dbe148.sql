
CREATE OR REPLACE FUNCTION public.notify_website_contact_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_anon text;
BEGIN
  IF NEW.answers IS NULL OR (NEW.answers->>'source') IS DISTINCT FROM 'website-contact-form' THEN
    RETURN NEW;
  END IF;

  v_url := 'https://chqhyqylnbtwyzhjkxlu.supabase.co/functions/v1/notify-website-contact';
  v_anon := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocWh5cXlsbmJ0d3l6aGpreGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTExMTAsImV4cCI6MjA4MTgyNzExMH0.Ms0FvPMBX_qWoSsriDsmAul95lYCD_xZleh-5CZnGVc';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if notification fails
  RAISE WARNING 'notify_website_contact_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_website_contact_lead ON public.funnel_leads;
CREATE TRIGGER trg_notify_website_contact_lead
AFTER INSERT ON public.funnel_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_website_contact_lead();
