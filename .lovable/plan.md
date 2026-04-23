

# The Mind Coach: Sistema de Reservas

Agregar un nuevo flujo "Reservar" para The Mind Coach que permite apartar el espacio de un lead con un depósito ($200 default, editable) por hasta 3 meses, con un widget dedicado para gestionar estas reservas.

## Cambios principales

### 1. Nuevo estado "Reservado" en el flujo de leads

Actualmente al mover un lead desde Agendas o registrar resultado de cita, las opciones son: **Venta**, **No Venta**, **No Show**. Se agrega una 4ta opción: **Reservar**.

**Dónde aparece:**
- `LeadDetailDialog.tsx` (popup de lead en Agendas) — botón nuevo "Reservar"
- `AppointmentFormDialog.tsx` — opción nueva en el resultado de la cita
- `RegisterSaleDialog.tsx` — modo "Reserva" además de venta normal (solo para The Mind Coach)

**Comportamiento:**
- Al elegir "Reservar" se abre un sub-formulario:
  - Monto del depósito (default `$200`, editable)
  - Moneda (USD por defecto)
  - Producto/servicio que se reserva (selector de `client_products`)
  - Notas opcionales
  - Fecha de reserva (default hoy) → expira automáticamente a los 3 meses
- El lead/agenda queda marcado como `reserved` y se crea un registro en la nueva tabla `lead_reservations`.

### 2. Nuevo widget "Reservas" en /ventas (solo The Mind Coach)

`ReservationsWidget.tsx` — tarjetas tipo grid mostrando cada reserva:

```text
┌────────────────────────────────────┐
│ [Avatar] Nombre del Lead           │
│ Producto: Certificación XYZ        │
│ Depósito: $200 USD                 │
│ Reservado: 22 Abr 2026             │
│ Vence: 22 Jul 2026  [82 días]      │
│ [Convertir en Venta] [No Venta]    │
└────────────────────────────────────┘
```

**Estados visuales (color del borde/fondo):**
- 🟢 **Verde** → más de 60 días restantes (recién reservado)
- 🟡 **Amarillo** → entre 30-60 días restantes
- 🟠 **Naranja** → menos de 30 días restantes (urgente)
- 🔴 **Rojo** → vencida (>3 meses desde la fecha de reserva)

Click en la tarjeta → abre `LeadDetailDialog` con el lead asociado, donde el usuario puede:
- **Convertir en Venta** → abre `RegisterSaleDialog` con el depósito ya aplicado como adelanto
- **Marcar como No Venta** → cierra la reserva con resultado perdido
- **Editar reserva** (monto, notas)

**Filtros del widget:** Activas / Vencidas / Todas, ordenado por fecha de vencimiento ascendente.

### 3. Conversión de reserva a venta

Al convertir una reserva en venta, el flujo de `RegisterSaleDialog`:
- Pre-llena el cliente, producto y datos del lead
- Aplica el monto reservado como **Adelanto** (compatible con la lógica existente de "Adelantos" para academic/clinical clients)
- Marca la reserva con `status = 'converted'` y guarda el `sale_id` para trazabilidad
- La reserva sale del widget de Reservas y la venta aparece en los flujos normales

### 4. Notificaciones

- Trigger en BD: cuando una reserva entra a los últimos 30 días o vence → crear notificación en tiempo real (siguiendo el patrón existente de `Real-time Activity Alerts`)
- Formato: "Reserva de [Cliente] vence en X días — [Producto] — $200"

### 5. Feature flag

Nuevo flag `reservations_widget` en `client_feature_flags` (default `false`, activado solo para The Mind Coach). Se agrega también al Widget Catalog.

## Detalles técnicos

**Nueva tabla `lead_reservations`:**
```text
id              uuid PK
client_id       uuid (RLS por has_client_access)
lead_id         uuid (FK setter_appointments, nullable)
customer_name   text
customer_phone  text
customer_email  text
product_id      uuid (FK client_products, nullable)
product_name    text  (snapshot por si se borra el producto)
deposit_amount  numeric  default 200
currency        text     default 'USD'
reserved_at     date     default CURRENT_DATE
expires_at      date     generated: reserved_at + 3 months
status          text     default 'active'  ('active' | 'converted' | 'lost' | 'expired')
sale_id         uuid     nullable (FK message_sales, cuando se convierte)
notes           text
created_by      uuid
created_at, updated_at  timestamptz
```

**RLS:** Mismo patrón que el resto (`is_admin_or_higher` para ALL, `has_client_access` para CRUD por team members).

**Estado en `setter_appointments`:** se agrega `'reserved'` como valor válido en el campo de resultado, mostrado con badge azul/púrpura distinto a venta/no venta/no show.

**Cálculo del color:** función helper `getReservationUrgency(expires_at)` → devuelve `'green' | 'yellow' | 'orange' | 'red'`, usada también para ordenar.

**Hook nuevo:** `use-lead-reservations.ts` con TanStack Query (`staleTime: 5m`, filtrado por `client_id`), invalida cache al crear/convertir/perder.

**Archivos a crear:**
- `src/components/ventas/ReservationsWidget.tsx`
- `src/components/ventas/ReservationFormDialog.tsx` (sub-formulario reutilizable)
- `src/hooks/use-lead-reservations.ts`
- Migración: tabla `lead_reservations` + RLS + trigger de notificación

**Archivos a modificar:**
- `src/components/ventas/LeadDetailDialog.tsx` — botón "Reservar"
- `src/components/ventas/AppointmentFormDialog.tsx` — opción "Reservar" en resultado
- `src/components/dashboard/RegisterSaleDialog.tsx` — soporte de pre-cargar reserva como adelanto
- `src/pages/Ventas.tsx` — montar `ReservationsWidget` cuando flag activo
- `src/components/catalog/WidgetCatalog.tsx` — registrar nuevo widget
- `src/components/clientes/ClientFeatureFlags.tsx` — toggle del flag
- Migración de feature flags: agregar columna `reservations_widget boolean default false`

## Posición del widget en /ventas

Siguiendo la jerarquía existente de The Mind Coach (Metas → Pipeline → Cobros), insertar **Reservas justo después de Cobros**, ya que es operacionalmente similar (seguimiento de pagos pendientes / espacios apartados).

