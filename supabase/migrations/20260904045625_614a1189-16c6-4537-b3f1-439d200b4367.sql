-- El módulo de pagos arranca en setiembre 2026: se eliminan los registros
-- de cobro con vencimiento anterior al 2026-09-01 (heredados de 2025).
DELETE FROM public.agency_payment_records
WHERE due_date < DATE '2026-09-01';