# Pagos: setiembre 2026 como mes cero

Todo el módulo de Pagos arranca en **setiembre 2026**. Nada anterior se factura, se cobra ni se muestra.

## Qué cambia

1. **Sin meses anteriores en el navegador de mes**
   La flecha "mes anterior" se desactiva al llegar a setiembre 2026, y si el mes guardado fuera anterior se corrige automáticamente a setiembre 2026.

2. **Atrasados solo desde setiembre 2026**
   Hoy el cálculo mira los 12 meses previos, por eso aparecen 24 cobros "atrasados" de 2025 (Calma). Con el cambio, el bloque de atrasados solo considera cuotas con vencimiento igual o posterior al 1 de setiembre de 2026, así que ese bloque queda vacío hasta que venza el primer tracto real.

3. **Métricas y matriz sin arrastre histórico**
   MRR, cobrado, pendiente y la matriz mensual solo generan cuotas para meses desde setiembre 2026 en adelante.

4. **Limpieza de datos previos**
   Se borran los registros de `agency_payment_records` con vencimiento anterior al 2026-09-01 (los cobros heredados de 2025 que hoy inflan los atrasados). Los clientes y sus tractos no se tocan.

## Detalle técnico

- Nueva constante exportada en `src/hooks/use-agency-payments.ts`:
  `export const PAYMENTS_START = new Date(2026, 8, 1);` más un helper `isBeforeStart(month: Date)`.
- `buildInstallments(month)` devuelve `[]` si `month < PAYMENTS_START`.
- El memo `overdue` cambia el bucle de 12 meses fijos por un recorrido acotado: se detiene cuando el mes evaluado es anterior a `PAYMENTS_START`, y descarta cuotas con `dueIso < '2026-09-01'`.
- `src/pages/agencia/Pagos.tsx`: el inicializador de `monthDate` hace `max(mes actual, PAYMENTS_START)`; `onShift(-1)` no baja de `PAYMENTS_START` y el botón anterior se renderiza deshabilitado en ese límite.
- Migración de limpieza: `delete from public.agency_payment_records where due_date < '2026-09-01';`

## Verificación

- `/agencia/pagos` en setiembre 2026: bloque de atrasados ausente, MRR y pendientes solo del mes.
- Flecha izquierda deshabilitada en setiembre 2026; la derecha sigue navegando a futuro.
