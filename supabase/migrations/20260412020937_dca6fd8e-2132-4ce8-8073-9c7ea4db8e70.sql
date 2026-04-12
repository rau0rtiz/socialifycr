
CREATE OR REPLACE FUNCTION public.notify_on_sale_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_name TEXT;
  client_name TEXT;
  team_member RECORD;
  sale_amount TEXT;
  currency_symbol TEXT;
BEGIN
  -- Actor is the closer/seller if available, otherwise fall back to creator profile
  IF NEW.closer_name IS NOT NULL AND NEW.closer_name != '' THEN
    actor_name := NEW.closer_name;
  ELSE
    SELECT COALESCE(full_name, email, 'Alguien') INTO actor_name
    FROM public.profiles WHERE id = NEW.created_by;
  END IF;

  -- Get client name
  SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;

  -- Format amount
  IF NEW.currency = 'CRC' THEN
    currency_symbol := '₡';
  ELSE
    currency_symbol := '$';
  END IF;
  sale_amount := currency_symbol || to_char(NEW.amount, 'FM999,999,999');

  -- Notify all team members of this client (except the creator)
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
      'sale_created',
      'Nueva venta registrada',
      actor_name || ' registró una venta de ' || sale_amount || COALESCE(' — ' || NEW.customer_name, '') || ' (' || COALESCE(client_name, '') || ')',
      jsonb_build_object('sale_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

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
  appt_time TEXT;
BEGIN
  -- Actor is the setter if available, otherwise fall back to creator profile
  IF NEW.setter_name IS NOT NULL AND NEW.setter_name != '' THEN
    actor_name := NEW.setter_name;
  ELSE
    SELECT COALESCE(full_name, email, 'Alguien') INTO actor_name
    FROM public.profiles WHERE id = NEW.created_by;
  END IF;

  -- Get client name
  SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;

  -- Format appointment time
  appt_time := to_char(NEW.appointment_date AT TIME ZONE 'America/Costa_Rica', 'DD/MM HH12:MI AM');

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
      'Nueva agenda',
      actor_name || ' agendó a ' || NEW.lead_name || ' — ' || appt_time || ' (' || COALESCE(client_name, '') || ')',
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', NEW.lead_name, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
