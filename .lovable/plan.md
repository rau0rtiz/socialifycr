

# Rediseño del Widget de Cobros — Vista por Persona con Secciones por Fecha

## Problema actual
El widget de Cobros muestra una lista plana de cuotas sin contexto de quién debe pagar. Se oculta si no hay cobros. No agrupa por persona ni por urgencia temporal, dificultando el seguimiento de pagos pendientes.

## Diseño propuesto

### Vista principal (siempre visible debajo de Ventas)
```text
┌─────────────────────────────────────────────┐
│ 💰 Cobros                    Pendiente: $X  │
├─────────────────────────────────────────────┤
│ 🔴 VENCIDOS (2)                             │
│ ┌─────────────┐ ┌─────────────┐            │
│ │ Juan Pérez  │ │ María López │            │
│ │ $500 · 3d   │ │ $300 · 1d   │            │
│ └─────────────┘ └─────────────┘            │
│                                             │
│ 📅 HOY (1)                                  │
│ ┌─────────────┐                             │
│ │ Pedro Ruiz  │                             │
│ │ $1,200      │                             │
│ └─────────────┘                             │
│                                             │
│ ⏳ PRÓXIMOS (3)                              │
│ ┌─────────────┐ ┌─────────────┐ ┌────...   │
│ │ Ana García  │ │ Luis Torres │            │
│ │ $800 · 5d   │ │ $600 · 12d  │            │
│ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────┘
```

### Al hacer clic en una persona → Dialog con detalle
```text
┌──────────────────────────────────┐
│ Cobros — Juan Pérez              │
│ Producto: Certificación LCH      │
│ Total: $3,400 · 3 cuotas         │
├──────────────────────────────────┤
│ ✅ Cuota 1 · $1,133 · 5 abr 2026│
│ ⏳ Cuota 2 · $1,133 · 15 may     │ ← [Cobrado]
│ ⏳ Cuota 3 · $1,133 · 14 jun     │
├──────────────────────────────────┤
│ [Editar] [Eliminar]              │
└──────────────────────────────────┘
```

Una vez que **todas** las cuotas de una persona estén pagadas, esa persona desaparece de la vista principal.

## Cambios técnicos

### 1. `src/hooks/use-payment-collections.ts` — Enriquecer con datos de venta
- Modificar la query para hacer un join con `message_sales` y traer `customer_name`, `product`, `total_sale_amount`, `num_installments`
- Agrupar colecciones por `sale_id` para crear una vista por persona
- Exponer una estructura agrupada: `Map<sale_id, { customerName, product, collections[] }>`

### 2. `src/components/ventas/CollectionsWidget.tsx` — Rediseño completo
- **Siempre visible** (eliminar el `if (collections.length === 0) return null`)
- Mostrar estado vacío cuando no hay cobros pendientes ("No hay cobros pendientes")
- **Agrupar por persona** (sale_id) y mostrar solo personas con cobros pendientes
- **3 secciones por fecha**:
  - **Vencidos**: `due_date < hoy` y status !== 'paid'
  - **Hoy**: `due_date === hoy` y status !== 'paid'
  - **Próximos**: `due_date > hoy` y status !== 'paid'
- Cada persona se muestra como una tarjeta compacta con nombre, monto de la próxima cuota, y días hasta/desde vencimiento
- Al hacer clic en una persona → Dialog con historial completo (pagadas y pendientes)
- En el dialog: botón "Cobrado" para marcar cuotas, editar fechas/montos, eliminar

### 3. `src/pages/Ventas.tsx` — Mostrar siempre
- Quitar la condicionalidad; el widget siempre se renderiza debajo de SalesTrackingSection

## Archivos a modificar
- `src/hooks/use-payment-collections.ts`
- `src/components/ventas/CollectionsWidget.tsx`
- `src/pages/Ventas.tsx` (menor — solo asegurar permanencia)

