## Rediseño paso "Pago" de Registrar Venta + Flujo de Abono → Cobros

### 1. Paso "Pago" estilo checkout Amazon (2 columnas)

Reemplazo del último paso del `RegisterSaleDialog` con layout de dos columnas:

**Columna izquierda — Información**
- Método de pago (selector con opción "+ Nuevo")
- Fuente de la venta (selector existente)
- Fecha (date picker)
- Vendedor — combo existente (`useClientClosers`) **+ botón "+ Nuevo"** que crea via `addCloser` y queda guardado en el cliente
- Notas adicionales (textarea)
- Toggle "Aplicar IVA (13%)"
- Toggle "Aplicar descuento" → input monto + **textarea razón obligatoria**
- Toggle "Es abono (pago parcial)" → input monto del abono

**Columna derecha — Resumen sticky**
- Producto seleccionado
- Precio base (read-only, viene del producto seleccionado en paso anterior — sin campo editable)
- IVA (si aplica)
- Descuento (si aplica) en negativo
- **Total**
- Si abono: muestra "Abonado hoy" / "Saldo pendiente"
- Botón "Confirmar venta"

Validaciones:
- Si descuento > 0 → razón obligatoria
- Si abono activo → monto > 0 y < total
- Precio base no editable (solo viene del producto)

### 2. Cambios al flujo de abono

Cuando se marca venta como abono:
- Se crea `message_sales` con `amount = monto abonado`, `total_sale_amount = total real`, `installments_paid = 1`, `num_installments = NULL` (pendiente de definir), y un flag interno: `payment_schedule_pending = true` (nueva columna boolean en `message_sales`).
- **NO** se generan `payment_collections` automáticas (a diferencia del flujo actual de cuotas fijas).

### 3. Widget "Cobros" en Ventas

Añadir el `CollectionsWidget` existente como sección visible en `/ventas` (ya existe el componente). Encima de las cobranzas activas, una **sección "Pendientes de programar"** que lista todas las ventas con `payment_schedule_pending = true`:

```
┌─────────────────────────────────────────────┐
│ ⚠ Cliente X — Producto Y                     │
│ Saldo: ₡45.000 · [Establecer fechas de pago] │
└─────────────────────────────────────────────┘
```

### 4. Diálogo "Establecer fechas de pago"

Nuevo `SetPaymentScheduleDialog`:

```
Saldo pendiente: ₡45.000
Restante a asignar: ₡45.000  (live)

[📅 15/05/2026]  [₡15.000]  [×]
[📅 30/05/2026]  [₡15.000]  [×]
[📅 15/06/2026]  [₡15.000]  [×]
[+ Agregar otra fecha]

Restante: ₡0  ✓
[Guardar cobros]
```

Lógica:
- Suma en vivo, botón Guardar deshabilitado hasta `restante === 0`.
- Al guardar: inserta `payment_collections` (una por fecha), actualiza la venta con `num_installments`, `installment_amount` (promedio o primer monto), y limpia `payment_schedule_pending`.

### Archivos

**Nuevos**
- `src/components/ventas/SetPaymentScheduleDialog.tsx`
- `src/components/ventas/PendingSchedulesSection.tsx`

**Editados**
- `src/components/dashboard/RegisterSaleDialog.tsx` — rediseño paso pago (checkout 2 col), inline crear vendedor, IVA toggle, descuento+razón, abono.
- `src/hooks/use-client-closers.ts` — exponer `addCloser` (revisar si ya existe).
- `src/hooks/use-payment-collections.ts` — agregar query/mutación para ventas con schedule pendiente.
- `src/pages/Ventas.tsx` — montar widget de Cobros visible (si no lo está) con sección "Pendientes".

**Migración**
- `ALTER TABLE message_sales ADD COLUMN payment_schedule_pending boolean DEFAULT false;`

### Puntos a confirmar

- IVA: ¿usamos 13% fijo (CR) o configurable? Asumo **13% fijo** salvo que digas otro.
- Vendedor inline: lo creo con `useClientClosers.addCloser` (lista de cierres del cliente). ¿OK o prefieres `client_setters`?
- Tab de Cobros: ¿lo agrego como sección dentro de `/ventas` o como tab nuevo? Asumo **sección visible scrolleable** dentro de la misma página.