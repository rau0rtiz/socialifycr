# Pagos de clientes (/agencia/pagos) — rehecho

Tracker mensual de facturación y cobros de la agencia, editable por cliente, con MRR separado por moneda.

## Qué vas a ver

**Encabezado**
- Selector de mes (anterior / actual / siguiente), igual estilo que el resto de /agencia.
- MRR del mes en dos bloques separados: **CRC** (₡) y **USD** ($). Sin conversión entre monedas.
- Por cada moneda: facturado del mes, cobrado, pendiente.

**Franja de atrasados**
- Arriba de la tabla, listado de cuotas vencidas de meses anteriores que siguen sin pagar (cliente, mes, monto, días de atraso), con acción rápida para marcar pagado.

**Lista del mes**
- Una fila por cliente que factura ese mes, con su logo (el que ya tiene el cliente en el sistema; se puede subir uno si no existe).
- Fecha de facturación, y una o dos fechas de pago (tractos) con su monto individual.
- Estado por tracto: pendiente / pagado (con fecha y método: Compra Click, SINPE, efectivo, transferencia).
- Total del cliente en su moneda, con IVA opcional.
- Clientes trimestrales que no cobran ese mes aparecen atenuados con “Próximo pago: <mes>”.

**Editar cliente (panel)**
- Foto/logo, nombre, moneda (CRC o USD), IVA, activo/inactivo.
- Frecuencia: mensual o trimestral + mes inicial (para calcular los meses que le tocan).
- Día de facturación.
- Tractos: 1 o 2 fechas de pago con monto por fecha.
- Datos de facturación: razón social / nombre, cédula jurídica, correo, teléfono, dirección.

**Clientes cargados**
Se eliminan los 10 actuales y se cargan estos 17, inactivos de monto en 0 hasta que los edites:
Speak Up, Roberto Olivas, Comfortex, Monnry, Dr. Villegas, Dra. Clara Valdez, RPM Concrete, Calma, Mawi, GJ Derecho, Fumero Dental Clinic, Hilda Lopez, Petshop2go, Clínica Santorini, CG Acabados, MiBodega, Maracuya Jewels.

## Detalles técnicos

**Base de datos (migración)**
- `agency_payment_clients`: agregar `logo_url`, `client_id` (link opcional al cliente del sistema para heredar logo), `billing_frequency` ('monthly' | 'quarterly'), `anchor_month` (date, mes inicial del ciclo trimestral), `invoice_day` (int), y datos de facturación: `billing_name`, `billing_tax_id`, `billing_email`, `billing_phone`, `billing_address`.
- `agency_payment_dates`: se mantiene (day_of_month, amount, label, sort_order) como los tractos.
- `agency_payment_records`: se mantiene (period, due_date, amount, currency, paid, paid_at, payment_method, notes) — es lo que persiste el historial mes a mes.
- Limpieza: borrar registros/fechas/clientes actuales e insertar los 17 nuevos, ligados por nombre a `clients` cuando exista coincidencia para tomar el logo.
- GRANTs y RLS: mantener el patrón actual (solo miembros de agencia/admins).

**Frontend**
- Reescribir `src/pages/agencia/Pagos.tsx` como página delgada y mover lógica a:
  - `src/hooks/use-agency-payments.ts` — queries del mes, atrasados, mutaciones (crear/editar cliente, tractos, marcar pagado).
  - `src/components/agency-payments/MonthHeader.tsx` — selector de mes + MRR CRC/USD.
  - `src/components/agency-payments/OverdueStrip.tsx`.
  - `src/components/agency-payments/PaymentClientRow.tsx`.
  - `src/components/agency-payments/PaymentClientDialog.tsx` — edición completa, reutiliza `BillingInfoSection` para los datos de facturación.
- Cálculo trimestral: un cliente cobra en el mes M si `diffMonths(M, anchor_month) % 3 === 0`; el próximo pago se deriva del mismo cálculo.
- Los montos por moneda nunca se suman entre sí; los totales se agrupan por `currency`.
