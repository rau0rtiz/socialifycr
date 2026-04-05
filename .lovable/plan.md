

# Sincronizar Lead (Agenda) y Venta + Cambiar Anuncio en ambos

## Problema
1. No se puede cambiar el anuncio asociado una vez registrado el lead o la venta
2. La agenda y la venta representan la misma persona pero los datos no están sincronizados — un cambio en uno no se refleja en el otro

## Cambios

### 1. `LeadDetailDialog.tsx` — Permitir editar anuncio del lead
- Agregar un botón "Cambiar" junto al campo de anuncio que abre un mini-dialog/popover con el `AdGridSelector`
- Al seleccionar un nuevo anuncio, llamar `onUpdateChecklist` (o un nuevo callback `onUpdateAd`) para actualizar `ad_id`, `ad_name`, `ad_campaign_id`, `ad_campaign_name` en el appointment
- **Sincronización**: si el appointment tiene `sale_id`, también actualizar la venta correspondiente en `message_sales` con los mismos datos de anuncio

### 2. `SalesTrackingSection.tsx` — Permitir editar anuncio de la venta
- Agregar un botón "Cambiar anuncio" en la fila de cada venta (o en el dialog de edición)
- Al cambiar, actualizar `ad_id`, `ad_name`, `ad_campaign_id`, `ad_campaign_name` en `message_sales`
- **Sincronización**: buscar el appointment vinculado (via `sale_id` en `setter_appointments`) y actualizar los mismos campos de anuncio ahí también

### 3. `SetterTracker.tsx` — Propagar cambios de datos del lead a la venta
- Cuando se edita un appointment (nombre, teléfono, email) y ese appointment tiene `sale_id`, también actualizar `customer_name`, `customer_phone`, `customer_email` en `message_sales`
- Lo mismo al revés: cuando se edita una venta con un `appointmentId` asociado, propagar cambios de nombre/teléfono/email al appointment

### 4. `use-setter-appointments.ts` — Función de sync bidireccional
- Crear una función helper `syncAppointmentAndSale` que, dado un appointment ID y los campos actualizados, propague los cambios relevantes al registro de venta vinculado
- Campos sincronizados: `lead_name` ↔ `customer_name`, `lead_phone`, `lead_email`, `ad_id`, `ad_name`, `ad_campaign_id`, `ad_campaign_name`

### 5. `use-sales-tracking.ts` — Sync inverso
- En `updateSale`, si los campos de nombre/contacto/anuncio cambian, buscar el appointment vinculado y actualizarlo

### 6. `Ventas.tsx` — Vincular sale_id al appointment al registrar venta
- En `handleSaleRegistered`, después de marcar el appointment como `sold`, también guardar el `sale_id` en el appointment para mantener el link bidireccional (actualmente solo se cambia el status)

## Archivos a modificar
- `src/components/ventas/LeadDetailDialog.tsx`
- `src/components/dashboard/SalesTrackingSection.tsx`
- `src/components/ventas/SetterTracker.tsx`
- `src/hooks/use-setter-appointments.ts`
- `src/hooks/use-sales-tracking.ts`
- `src/pages/Ventas.tsx`

