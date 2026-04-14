CREATE OR REPLACE FUNCTION public.notify_on_appointment_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_name TEXT;
  client_name TEXT;
  team_member RECORD;
  call_time TEXT;
BEGIN
  -- Actor is the setter
  IF NEW.setter_name IS NOT NULL AND NEW.setter_name != '' THEN
    actor_name := NEW.setter_name;
  ELSE
    SELECT COALESCE(full_name, email, 'Alguien') INTO actor_name
    FROM public.profiles WHERE id = NEW.created_by;
  END IF;

  -- Get client name
  SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;

  -- Format the sales call date if available, otherwise use appointment_date
  IF NEW.sales_call_date IS NOT NULL THEN
    call_time := to_char(NEW.sales_call_date AT TIME ZONE 'America/Costa_Rica', 'DD/MM HH12:MI AM');
  ELSE
    call_time := to_char(NEW.appointment_date AT TIME ZONE 'America/Costa_Rica', 'DD/MM HH12:MI AM');
  END IF;

  -- Notify all team members (except the creator)
  FOR team_member IN
    SELECT user_id FROM public.client_team_members
    WHERE client_id = NEW.client_id AND user_id != NEW.created_by
    UNION
    SELECT user_id FROM public.user_roles
    WHERE role IN ('owner', 'admin') AND user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, client_id, type, title, body, metadata)
    VALUES (
      team_member.user_id,
      NEW.client_id,
      'appointment_created',
      'Nueva agenda de venta',
      actor_name || ' agendó a ' || NEW.lead_name || ' para llamada de venta — ' || call_time || ' (' || COALESCE(client_name, '') || ')',
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', NEW.lead_name, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;