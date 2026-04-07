# Ventas para Dra Silvia Alvarado + Unificar nombre de sección

### 1. Sección de Ventas para Dra Silvia Alvarado

Un layout simplificado orientado a servicios estéticos (valoraciones → procedimientos → cobro). Más ligero que Mind Coach (sin setter pipeline ni daily reports), pero con seguimiento de pacientes y procedimientos.

**Layout propuesto:**

```text
┌─────────────────────────────────────────────┐
│  KPIs: Valoraciones | Procedimientos |      │
│        Ingresos     | Por cobrar            │
├─────────────────────────────────────────────┤
│  Barra de Meta de Ventas (ya existe)        │
├─────────────────────────────────────────────┤
│  Registro de Ventas (SalesTrackingSection)  │
├─────────────────────────────────────────────┤
│  Cobros (CollectionsWidget - ya existe)     │
├─────────────────────────────────────────────┤
│  Ventas por Producto (gráfico existente)    │
└─────────────────────────────────────────────┘
```

**Detalle de KPIs (nuevo componente `ClinicSalesSummary`):**

- **Valoraciones del mes**: Cuenta de `setter_appointments` con status `scheduled` o `completed` (las valoraciones son el equivalente de "citas")
- **Procedimientos realizados**: Ventas completadas del mes (`message_sales` con status != cancelled)
- **Ingresos**: Suma de ventas del mes (CRC + USD)
- **Por cobrar**: Suma de `payment_collections` pendientes

Este componente reutiliza hooks existentes (`useSalesTracking`, `usePaymentCollections`, `useSetterAppointments`) — no requiere cambios de base de datos.

**Ocultar para Dra Silvia:** SetterTracker completo, SetterDailyCalendar, PipelineSummary, CampaignsDrilldown. Solo mostrar el flujo simplificado: KPIs → Meta → Ventas → Cobros → Gráfico.

## Archivos a crear

- `src/components/ventas/ClinicSalesSummary.tsx` — KPIs de valoraciones/procedimientos/ingresos/por cobrar

## Archivos a modificar

- `src/components/dashboard/Sidebar.tsx` — unificar label a "Ventas" para todos
- `src/pages/Ventas.tsx` — agregar detección `isSilvia`, renderizado condicional del nuevo componente, ocultar widgets que no aplican

## Detalle técnico

```typescript
// Sidebar.tsx - simplificar
const ventasLabel = 'Ventas'; // siempre "Ventas"

// Ventas.tsx - detección
const isSilvia = selectedClient?.name?.toLowerCase().includes('silvia');

// Render condicional
{isSilvia && <ClinicSalesSummary clientId={selectedClient.id} />}
```

El componente `ClinicSalesSummary` usa la misma estructura visual de cards que `SpeakUpSalesSummary` pero con terminología médica (Valoraciones, Procedimientos, Pacientes).