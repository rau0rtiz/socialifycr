## Objetivo
Tissue es retail (ropa y accesorios). No usa agendas, ni setters, ni cobros a plazos, ni pipeline de leads. Hay que ocultar todos los widgets que asumen ese flujo y dejar solo lo relevante para una tienda.

## Qué queda visible para Tissue
- Header con rango de fechas global.
- **Sales Goal Bar** (meta del mes).
- **CTA "Nueva venta o apartado"** (ya existente).
- **Sales Tracking** (lista de ventas registradas) — limitado a ventas de Tissue.
- **Ventas por Talla** (`SalesBySizeChart`).
- **Ventas por Producto** y **Ventas por Marca** (`salesDistributionSection`).
- **Recent Sales Ticker** (feed de ventas recientes).

## Qué se oculta para Tissue
- `SetterTracker` (pipeline lead → venta).
- `SetterDailyCalendar` y reportes diarios de setter.
- `ClosureRateWidget` (tasa de cierre depende de agendas).
- `AdSalesRanking` y `CampaignsDrilldown` (no manejan publicidad atribuida tipo agencia).
- `CollectionsWidget` (cobros a plazos — retail cobra al momento).
- `ReservationsWidget` (las reservas de Tissue se manejan como "apartado" dentro del flujo de venta).
- `PipelineSummaryWidget`.
- Pre-call checklist y configuración de setters.

## Cambios en `Sidebar`
- Para Tissue ocultar el link **Asistencia** (no aplica).
- Mantener: Dashboard, Ventas, Client Database, Business Setup.

## Cambios en `BusinessSetup`
- Para Tissue ocultar las tarjetas: **Profesores**, **Grupos**, **Funcionalidades → checklist de setter / setter tracker / reservas**.
- Mantener visibles: Marca, Productos, **Inventario** (ya tissueOnly), Equipo, Conexiones.
- En el panel de feature flags, para Tissue desactivar/ocultar: `setter_tracker`, `setter_checklist`, `reservations_widget`, `setter_daily`, `asistencia_section`.

## Cambios en `RegisterSaleDialog` (cuando aplica a Tissue)
- Si `isTissue`, redirigir el botón "Nueva venta" al **TissueSaleDialog** (ya existe) en vez del genérico.
- Asegurar que `RecentSalesTicker` para Tissue muestre marca/talla/color en el detalle.

## Archivos a editar
- `src/pages/Ventas.tsx` — gating de widgets con `!isTissue`.
- `src/components/dashboard/Sidebar.tsx` — ocultar Asistencia para Tissue.
- `src/pages/BusinessSetup.tsx` — añadir flag `tissueHidden` a `Profesores`, `Grupos`; filtrar feature flags irrelevantes para Tissue.
- `src/components/clientes/ClientFeatureFlags.tsx` — opcional: marcar como N/A los flags de setter/reservas para Tissue.
- `src/components/dashboard/RegisterSaleDialog.tsx` — si Tissue, abrir `TissueSaleDialog`.

## Notas técnicas
- Toda la lógica usa el flag derivado `isTissue = selectedClient?.name?.toLowerCase().includes('tissue')`, ya en uso.
- No se borran componentes — solo se condiciona el render. Otros clientes no se ven afectados.
- No hay migraciones de DB; los flags y datos quedan intactos.
