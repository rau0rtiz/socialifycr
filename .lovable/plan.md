

# Rediseño visual de Cobros + Sincronización con Ventas + Mejoras visuales del Pipeline

## Resumen
Transformar la sección de Cobros en un layout de columnas tipo Kanban que muestre el flujo visual completo (Vencido → Hoy → Próximo → Cobrado). Además, conectar el marcado de cobros con la actualización de `installments_paid` y `amount` en `message_sales`, y mejorar la visualización general del Pipeline.

## Cambios

### 1. `CollectionsWidget.tsx` — Layout Kanban de 3+1 columnas

Rediseño completo: en vez de secciones verticales apiladas, usar un layout horizontal de columnas tipo tablero:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  🔴 VENCIDO  │  🟡 HOY      │  ⏳ PRÓXIMO   │  ✅ COBRADO  │
│  (2)         │  (1)         │  (3)          │  (4)         │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │Juan Pérez│ │ │Pedro Ruiz│ │ │Ana García│ │ │María L.  │ │
│ │Producto  │ │ │$1,200    │ │ │$800 · 5d │ │ │$500 ✓    │ │
│ │$500 · 3d │ │ │          │ │ │          │ │ │          │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│ ┌──────────┐ │              │ ┌──────────┐ │ ┌──────────┐ │
│ │María L.  │ │              │ │Luis T.   │ │ │Carlos R. │ │
│ │$300 · 1d │ │              │ │$600 · 12d│ │ │$200 ✓    │ │
│ └──────────┘ │              │ └──────────┘ │ └──────────┘ │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- **4 columnas**: Vencido (rojo), Hoy (amber), Próximo (gris), Cobrado (verde)
- La columna "Cobrado" muestra personas que completaron su último pago recientemente (ultimos 30 dias) para dar feedback visual de progreso
- Cada tarjeta muestra: nombre, producto, monto de siguiente cuota, indicador de progreso (2/5 cuotas)
- Header de cada columna con conteo y monto total de esa columna
- Scroll vertical por columna si hay muchas tarjetas
- En mobile: tabs horizontales en vez de columnas

### 2. `use-payment-collections.ts` — Incluir grupos completados + sync con venta

- Exponer también `completedGroups` (allPaid === true, con paid_at reciente)
- En `updateCollection` (marcar como pagado): después de actualizar el cobro, recalcular cuántas cuotas están pagadas para esa venta y actualizar `message_sales.installments_paid` y `message_sales.amount` (cash collected = sum de cuotas pagadas)
- Invalidar también la query de `sales-tracking` para que la sección de Ventas refleje los cambios inmediatamente

### 3. `CollectionDetailDialog.tsx` — Mejorar visualización

- Agregar una barra de progreso visual que muestre cuotas pagadas vs total
- Mostrar resumen arriba: total del contrato, total cobrado, total pendiente
- Timeline visual con línea conectora entre cuotas (en vez de tarjetas sueltas)
- Cada cuota con estado visual claro (check verde, reloj naranja, alerta roja)

### 4. `PipelineSummaryWidget.tsx` — Mejoras visuales

- Reducir la densidad: de 8 columnas a un layout más legible de 4 columnas en desktop con iconos más grandes
- Separar visualmente los KPIs en grupos lógicos: **Adquisición** (Gasto, Conversaciones), **Pipeline** (Agendas, Show Rate, No Show), **Resultados** (Ventas, Close Rate, Cash Collected)
- Agregar mini-barras de progreso donde aplique (close rate, show rate)

### 5. `SalesTrackingSection.tsx` — Simplificar visualización

- Summary cards: consolidar en 3 tarjetas principales más grandes en vez de 5 pequeñas (Total Ventas con conteo, Cash Collected con desglose moneda, ROAS)
- Sales grid: agregar indicador visual de estado de cobros (barra de progreso mini si tiene cuotas)
- Reducir ruido visual eliminando badges redundantes

## Archivos a modificar
- `src/components/ventas/CollectionsWidget.tsx` — Rediseño Kanban
- `src/components/ventas/CollectionDetailDialog.tsx` — Timeline + progreso
- `src/hooks/use-payment-collections.ts` — Sync con venta + completed groups
- `src/components/ventas/PipelineSummaryWidget.tsx` — Layout mejorado
- `src/components/dashboard/SalesTrackingSection.tsx` — Simplificar cards

