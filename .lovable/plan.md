

User wants to keep the existing tabs (Detalle por Venta + Historial de Pagos) AND add the new card-based view with popup detail per closer.

## Plan refinado

### Estructura final de `/comisiones`
1. **KPIs arriba** (sin cambios): Total Comisión, Ganado, Pendiente, Pagado.
2. **Selector de mes** (nuevo): default = mes actual, navegable ← →. Filtra cards y KPIs.
3. **Tabs (se mantienen los 3 + 1 cambia):**
   - **Tab 1 — Por Closer (REDISEÑADO)**: Grid de cards 3:4 verticales. Reemplaza la lista actual.
   - **Tab 2 — Detalle por Venta** (sin cambios).
   - **Tab 3 — Historial de Pagos** (sin cambios).

### Card 3:4 vertical (`CloserCommissionCard`)
```
┌─────────────────┐
│   [Avatar]      │  círculo grande
│   Nombre        │
├─────────────────┤
│  Por pagar      │
│  $ 1,234        │  número grande
├─────────────────┤
│ Ventas mes: 5   │
│ Cobrado: $12k   │
│ Comisión: $1.5k │
│ Pagado: $266    │
├─────────────────┤
│  [Ver detalle]  │
└─────────────────┘
```
- Toda la card es clickeable → abre `CloserDetailDialog`.
- Si no tiene ventas en el mes: card atenuada con "Sin ventas este mes" pero sigue clickeable (muestra historial).
- Grid responsive: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.

### Popup `CloserDetailDialog`
- Header: avatar + nombre + 4 mini-KPIs del mes seleccionado.
- Botón **"Registrar pago"** → abre `RecordPayoutDialog` pre-filtrado a ese closer.
- Tabs internos:
  - **Ventas del mes**: tabla con cliente, monto venta, % cobrado, comisión, estado.
  - **Historial de pagos**: lista de payouts de ese closer (todos los meses), con opción de eliminar.

### Lista de closers a mostrar
Combinar fuentes para no perder a nadie:
1. `client_closers` del cliente.
2. Closers únicos en `closer_commissions` históricos.
3. `client_team_members` con rol `closer`.

Deduplicar por `closer_name` (case-insensitive).

### Filtro por mes
- Nuevo state `selectedMonth` (default mes actual UTC-6).
- KPIs y cards se recalculan según el mes.
- Tab "Detalle por Venta" también respeta el filtro; "Historial de Pagos" muestra todo.

### Archivos
**Nuevos:**
- `src/components/comisiones/CloserCommissionCard.tsx`
- `src/components/comisiones/CloserDetailDialog.tsx`
- `src/components/comisiones/MonthSelector.tsx`

**Modificados:**
- `src/pages/Comisiones.tsx` — agrega selector de mes + reemplaza contenido del tab "Por Closer" por grid de cards.
- `src/hooks/use-commissions.ts` — agrega fetch de `client_closers` + `client_team_members` para lista completa.

