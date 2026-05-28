## Objetivo

Cuando un lead del CRM de la agencia cambia a estado **Cliente** o **Perdido**, capturar información estructurada:

- **Cliente (Venta):** paquete vendido, qué incluye, monto, moneda y esquema de pago.
- **Perdido (Objeciones):** motivo principal + detalle/objeción de compra.

## Cambios en base de datos

Agregar columnas a `agency_crm_leads`:

- `sale_package` (texto): nombre del paquete (ej. "Setup + Mensualidad", "Solo Setup").
- `sale_includes` (texto): qué incluye el paquete.
- `sale_amount` (numérico).
- `sale_currency` (texto, default `USD`).
- `sale_payment_scheme` (texto): contado, mensual, anual, etc.
- `sale_closed_at` (fecha): cuándo se cerró la venta.
- `lost_reason` (texto, enum suave): precio, timing, competencia, sin presupuesto, no calificado, otro.
- `lost_objection` (texto largo): objeción/contexto detallado.
- `lost_at` (fecha).

## Cambios en UI (`CrmLeadDialog.tsx`)

Mostrar bloques condicionales según el estado seleccionado:

- Si `status === 'cliente'` → sección **"Detalle de la venta"** con: Paquete, Incluye, Monto + Moneda, Esquema de pago. Setear `sale_closed_at` automático al guardar si está vacío.
- Si `status === 'perdido'` → sección **"Objeción de compra"** con: Motivo (Select con opciones predefinidas + "Otro") y Detalle (textarea). Setear `lost_at` automático.
- Para los demás estados, los campos quedan ocultos pero conservan sus valores en BD.

Validación con `zod`: si pasa a `cliente`, el monto y paquete son obligatorios; si pasa a `perdido`, el motivo es obligatorio.

## Cambios en la vista de lista (`AgencyCRM.tsx`)

En cada fila/tarjeta de lead:
- Si es **Cliente**, mostrar chip pequeño con paquete y monto.
- Si es **Perdido**, mostrar chip pequeño con motivo.

## Hook (`use-agency-crm-leads.ts`)

Extender `AgencyCrmLead` y `CrmLeadInput` con los nuevos campos. Propagarlos en `createLead` y `updateLead`.

## Detalles técnicos

- Las nuevas columnas son nullable, no rompen registros existentes.
- RLS de `agency_crm_leads` ya existe (acceso por rol de agencia), no requiere cambios.
- `sale_amount` como `numeric(12,2)`.
- Motivos de pérdida (constante en el hook): `precio`, `timing`, `competencia`, `sin_presupuesto`, `no_calificado`, `otro`.
- Esquemas de pago sugeridos en datalist/select: `Contado`, `Mensual`, `Trimestral`, `Anual`, `Setup + Mensualidad`.
