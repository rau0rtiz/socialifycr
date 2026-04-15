INSERT INTO public.user_roles (user_id, role)
VALUES
  ('281af07a-93c3-43b0-95a6-01caf57f0f10', 'closer'),  -- Diogo
  ('7884f4cf-36ce-4f4e-ab03-60d0aa775bc6', 'closer'),  -- Fran
  ('0c10d8b7-42d0-45bf-a06c-72787e46c1ff', 'closer'),  -- Joaquín
  ('661ce398-bae5-4a86-aded-6cf6a8dff7f5', 'setter')   -- Nacho Arce
ON CONFLICT (user_id, role) DO NOTHING;