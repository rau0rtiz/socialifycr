INSERT INTO public.agency_crm_leads (name, status, notes, msg_contact_id)
SELECT
  COALESCE(NULLIF(c.display_name, ''), CASE WHEN i.username IS NOT NULL THEN '@' || i.username END, 'Contacto de Instagram'),
  'nuevo',
  concat_ws(E'\n',
    'Llegó por DM de Instagram (Chats).',
    CASE WHEN i.username IS NOT NULL THEN 'Usuario: @' || i.username END,
    CASE WHEN c.profile_url IS NOT NULL THEN 'Perfil: ' || c.profile_url END
  ),
  c.id
FROM public.msg_contacts c
JOIN public.msg_contact_identities i ON i.contact_id = c.id AND i.channel = 'instagram'
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_crm_leads l WHERE l.msg_contact_id = c.id
);