
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications for team members (via trigger)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify team members when a sale is created
CREATE OR REPLACE FUNCTION public.notify_on_sale_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  client_name TEXT;
  team_member RECORD;
  sale_amount TEXT;
  currency_symbol TEXT;
BEGIN
  -- Get creator name
  SELECT COALESCE(full_name, email, 'Alguien') INTO creator_name
  FROM public.profiles WHERE id = NEW.created_by;

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
      creator_name || ' registró una venta de ' || sale_amount || COALESCE(' — ' || NEW.customer_name, ''),
      jsonb_build_object('sale_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to notify team members when an appointment is created
CREATE OR REPLACE FUNCTION public.notify_on_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  client_name TEXT;
  team_member RECORD;
  appt_time TEXT;
BEGIN
  -- Get creator name
  SELECT COALESCE(full_name, email, 'Alguien') INTO creator_name
  FROM public.profiles WHERE id = NEW.created_by;

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
      COALESCE(NEW.setter_name, creator_name) || ' ha agendado a ' || NEW.lead_name || ' a las ' || appt_time,
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', NEW.lead_name, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_sale_created
  AFTER INSERT ON public.message_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_sale_created();

CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.setter_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_appointment_created();
