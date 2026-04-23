-- Activar el widget de Reservas para The Mind Coach y Hilda López
UPDATE public.client_feature_flags
SET reservations_widget = true,
    updated_at = now()
WHERE client_id IN (
  SELECT id FROM public.clients
  WHERE name ILIKE '%mind coach%' OR name ILIKE '%hilda%'
);

-- Asegurar que existan filas de feature_flags para esos clientes (por si alguno no tiene fila)
INSERT INTO public.client_feature_flags (client_id, reservations_widget)
SELECT c.id, true
FROM public.clients c
WHERE (c.name ILIKE '%mind coach%' OR c.name ILIKE '%hilda%')
  AND NOT EXISTS (
    SELECT 1 FROM public.client_feature_flags ff WHERE ff.client_id = c.id
  );