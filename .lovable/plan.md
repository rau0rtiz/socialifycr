

## Plan: Auto-confirm invited users + trigger-based team assignment

### What changes

1. **Enable auto-confirm for email signups** using the `configure_auth` tool so invited users can log in immediately after creating their account (no email verification step).

2. **Database migration — Enhance `handle_new_user` trigger** to auto-accept pending invitations when a user is created. This makes the flow bulletproof regardless of session state:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE inv RECORD;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));

  FOR inv IN
    SELECT id, client_id, role FROM public.client_invitations
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
  LOOP
    INSERT INTO public.client_team_members (client_id, user_id, role)
    VALUES (inv.client_id, NEW.id, inv.role) ON CONFLICT DO NOTHING;
    UPDATE public.client_invitations SET accepted_at = now() WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;
```

3. **Backfill existing stuck users** — INSERT the 3 closers (Fran, Diogo, Joaquín) into `client_team_members` for The Mind Coach and mark their invitations as accepted.

4. **Simplify `Invitacion.tsx`** — Remove the `accept_client_invitation` RPC call (lines 122-127) since the trigger handles it. After signup, redirect directly to dashboard instead of showing a "confirm email" message.

### Why this works
- The trigger runs with SECURITY DEFINER at user creation time — no session needed.
- Auto-confirm means the user gets a session immediately after signup and can navigate to the dashboard.
- The remaining invited users (majo, roman) will work automatically when they sign up.

