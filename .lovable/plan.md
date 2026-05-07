
# Plan — Alma Bendita: Export CSV + Revamp a Órdenes

Dos entregas separadas. La Parte 1 es rápida y sale ya. La Parte 2 es el revamp grande tipo Tissue.

---

## PARTE 1 — Exportar CSV mensual (rápido)

**Dónde:** Botón "Exportar CSV" arriba en `/ventas` cuando el cliente activo es Alma Bendita, junto al título o al lado del selector de mes.

**UX:** Click abre un pequeño popover/dropdown con dos opciones:
1. **Ventas por día** → columnas: `Fecha`, `Historias subidas`, `Cantidad de ventas`, `Monto total`
2. **Reporte de ventas (detalle)** → columnas: `Fecha de venta`, `Nombre de cliente`, `Monto`

**Datos:**
- Mes seleccionado (mismo `period` que ya usa la página)
- Opción 1: cruzar `daily_story_tracker` (historias subidas/día) + `message_sales` agregadas por día
- Opción 2: filas planas desde `message_sales` ordenadas por fecha

**Salida:** archivo `alma-bendita-ventas-YYYY-MM.csv` o `...-detalle-YYYY-MM.csv`, descarga directa en el navegador (Blob), sin backend.

---

## PARTE 2 — Revamp: Órdenes multi-producto

Hoy Alma Bendita registra **una venta = un producto** (desde una historia). Queremos pasar a **Órdenes** que pueden tener varios items, vengan o no de una historia, y siempre conecten con Client Database y con el módulo de Ventas.

### Modelo conceptual

```text
Orden
 ├─ Cliente (de customer_contacts) — obligatorio
 ├─ Dirección de envío (de customer_contacts.addresses) — opcional pero recomendado
 ├─ Fecha, método de pago, notas, estado (pendiente / pagada / enviada / entregada / cancelada)
 └─ Items[]
      ├─ Producto (catálogo o libre)
      ├─ Variante / talla
      ├─ Historia origen (opcional — link a stories)
      ├─ Cantidad, precio unitario, subtotal
      └─ Notas
 → Total de orden = suma de items
 → Cada item se refleja como una venta en message_sales (para no romper widgets actuales)
```

### Wizard "Nueva Orden" — 3 pasos

**Paso 1 — Cliente y dirección**
- Buscar cliente existente en `customer_contacts` (autocomplete por nombre/teléfono) o crear nuevo inline
- Seleccionar dirección guardada del cliente, o "Agregar nueva dirección" → abre **popup separado de dirección CR** (ver abajo)
- Ediciones a cliente/dirección se persisten en `customer_contacts`

**Paso 2 — Items**
Pestañas internas para no congestionar:
- **Desde historias activas** (24h) — grid 9:16 con miniaturas, click para agregar
- **Desde historias archivadas** — grid paginado con buscador por fecha/texto OCR
- **Sin historia** — selector de producto del catálogo + variante/talla + cantidad + precio

Por cada item agregado: línea editable con producto, variante, qty, precio, subtotal, botón eliminar. Total se actualiza en vivo.

**Paso 3 — Pago y confirmación**
- Método de pago, fecha, notas, estado
- Resumen completo (cliente, dirección, items, total)
- Al confirmar: se crea la orden, se crean N filas en `message_sales` (una por item) ligadas a `order_id`, se descuenta stock de variantes, se actualiza `customer_contacts.total_purchases`.

### Popup de Dirección CR (componente reutilizable)

Diseñado solo para Costa Rica, abre como Dialog separado:
- **Etiqueta** (Casa, Trabajo, etc.) — opcional
- **Provincia** (dropdown — 7 opciones fijas)
- **Cantón** (dropdown — filtrado por provincia seleccionada)
- **Distrito** (dropdown — filtrado por cantón seleccionado)
- **Señas exactas** (textarea — 200m sur del…)
- **Código postal** (auto-rellenado al escoger distrito, editable)
- **Teléfono de contacto** (opcional, default al del cliente)

Dataset CR (provincia → cantón → distrito) se incluye como JSON estático en `src/data/costa-rica-locations.ts` (~480 distritos). Reutilizable desde el wizard de orden y desde Client Database.

### Integración con módulos existentes

- **Client Database**: nueva pestaña "Órdenes" en el detalle del cliente; sección "Direcciones" con CRUD usando el mismo popup
- **Ventas (Alma Bendita)**: nuevo widget "Órdenes recientes" arriba del Story Revenue Tracker; el tracker actual sigue funcionando porque cada item sigue siendo una `message_sale`
- **Historias**: cuando una historia se usa como origen de un item, se marca visualmente como "vendida" en el grid

### Consideraciones

- No rompe el flujo actual: el botón "Registrar venta por historia" sigue existiendo como atajo (crea orden de 1 item internamente)
- Stock se descuenta solo cuando la orden pasa a estado distinto de "pendiente" (mismo patrón que apartados hoy)
- Las guías de Correos de CC quedan fuera de scope ahora pero el modelo de dirección ya queda listo

---

## Detalles técnicos (referencia)

**Parte 1 — Archivos a tocar:**
- `src/pages/Ventas.tsx` — botón export en el header cuando `isAlmaBendita`
- Nuevo `src/components/ventas/AlmaBenditaExportButton.tsx` — popover con dos opciones, genera CSV con Blob + download
- Reutiliza hooks `useSalesTracking` y `useDailyStoryTracker` ya cargados en la página

**Parte 2 — Cambios de DB (migración):**
- Tabla `orders` (client_id, customer_contact_id, shipping_address jsonb, status, payment_method, total_amount, currency, notes, created_by)
- Tabla `order_items` (order_id, product_id, variant_id, story_id, quantity, unit_price, subtotal, garment_size, notes)
- Columna `order_id` en `message_sales` (nullable, FK a orders)
- Trigger: al insertar `order_items` → crear `message_sales` linkeada y descontar stock variant
- RLS por `has_client_access(auth.uid(), client_id)`

**Parte 2 — Archivos nuevos:**
- `src/data/costa-rica-locations.ts`
- `src/components/common/CostaRicaAddressDialog.tsx`
- `src/components/ventas/orders/OrderWizardDialog.tsx` (3 pasos)
- `src/components/ventas/orders/OrdersWidget.tsx`
- `src/hooks/use-orders.ts`
- Update `src/pages/ClientDatabase.tsx` — pestaña Órdenes + sección Direcciones
- Update `src/components/clientes/CustomerDetailDialog.tsx` — direcciones CRUD

---

## Orden sugerido de ejecución

1. Implementar Parte 1 (export CSV) — entrega inmediata, ~1 iteración
2. Confirmar dataset CR a usar y estados de orden
3. Migración DB de órdenes
4. Popup de dirección CR (reutilizable)
5. Wizard de Nueva Orden (3 pasos)
6. Integración en Client Database y Ventas

¿Avanzo así o querés que la Parte 1 ya quede aprobada para implementar primero y dejamos la Parte 2 para iterar el diseño antes de tocar DB?
