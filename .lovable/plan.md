

# Remake de Ventas para Speak Up Costa Rica → "Sales"

## Resumen

Cuando el cliente seleccionado es "Speak Up" (deteccion por nombre), la seccion de Ventas se transforma en "Sales" con un diseno adaptado a una academia de idiomas que maneja suscripciones mensuales recurrentes, cursos de pago unico y planes de cuotas. El Client Database tambien se adapta para mostrar "Estudiantes" en vez de "Leads".

---

## Cambios principales

### 1. Sidebar: Renombrar a "Sales" para Speak Up
**Archivo:** `src/components/dashboard/Sidebar.tsx`

Agregar deteccion de Speak Up (similar a Mind Coach) para cambiar el label del menu a "Sales".

```
const isSpkUp = selectedClient?.name?.toLowerCase().includes('speak up');
const ventasLabel = isMindCoach ? 'Pipeline' : isSpkUp ? 'Sales' : 'Ventas';
```

### 2. Pagina Ventas: Layout personalizado para Speak Up
**Archivo:** `src/pages/Ventas.tsx`

Cuando `isSpkUp` es true:
- Titulo: "Sales" con subtitulo "Sales tracking & student management"
- Ocultar widgets de Mind Coach (SetterDailyCalendar, PipelineSummaryWidget)
- Ocultar SetterTracker (no usan agendas/setters)
- Mostrar: **Resumen mensual** → **Sales Goal Bar** → **Ventas (registro)** → **Cobros** → **Graficos**
- Ajustar labels internos: "Registrar Venta" → "Register Sale", etc.

### 3. SalesTrackingSection: Adaptaciones de UI para Speak Up
**Archivo:** `src/components/dashboard/SalesTrackingSection.tsx`

Detectar Speak Up y ajustar textos:
- Titulo del widget: "Sales" en vez de "Ventas"
- Boton: "Register Sale" en vez de "Registrar Venta"
- Mensaje vacio: "No sales registered this month"
- Mantener toda la logica funcional identica (productos, esquemas de pago, cobros)

### 4. Client Database: Adaptar para Speak Up
**Archivo:** `src/pages/ClientDatabase.tsx`

Cuando Speak Up esta seleccionado:
- Titulo: "Student Database" en vez de "Client Database"
- Labels: "Estudiante" en vez de "Lead", "Students" en vez de "Total Leads"
- Mantener misma estructura de datos (usa `setter_appointments` como base)

### 5. Resumen Mensual: Agregar widget simplificado para Speak Up
**Nuevo componente:** `src/components/ventas/SpeakUpSalesSummary.tsx`

Widget de KPIs simplificado (sin metricas de pipeline/setter):
- **Total Sales** (cantidad de ventas del mes)
- **Cash Collected** (efectivo recibido)
- **Pending** (cuotas pendientes)
- **New Students** (ventas unicas del mes = nuevos estudiantes)

Reutiliza datos de `useSalesTracking` y `usePaymentCollections`.

---

## Lo que NO cambia

- La logica de productos, esquemas de pago y cobros se mantiene intacta (ya soporta suscripciones mensuales y pagos unicos)
- `RegisterSaleDialog` no cambia — ya soporta el flujo completo de producto → esquema → cuotas
- `CollectionsWidget` no cambia — ya gestiona cobros pendientes y completados
- La tabla `message_sales` y `payment_collections` no requieren migraciones

---

## Detalle tecnico

**Archivos a modificar:**
1. `src/components/dashboard/Sidebar.tsx` — label condicional
2. `src/pages/Ventas.tsx` — layout condicional para Speak Up
3. `src/components/dashboard/SalesTrackingSection.tsx` — textos condicionales
4. `src/pages/ClientDatabase.tsx` — textos condicionales

**Archivo nuevo:**
5. `src/components/ventas/SpeakUpSalesSummary.tsx` — widget de KPIs simplificado

**Deteccion:** `selectedClient?.name?.toLowerCase().includes('speak up')`

