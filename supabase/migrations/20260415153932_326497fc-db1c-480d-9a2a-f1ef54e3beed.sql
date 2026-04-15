CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );

  -- Auto-accept any pending invitations for this email
  FOR inv IN
    SELECT id, client_id, role
    FROM public.client_invitations
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > now()
  LOOP
    INSERT INTO public.client_team_members (client_id, user_id, role)
    VALUES (inv.client_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;

    UPDATE public.client_invitations
    SET accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;