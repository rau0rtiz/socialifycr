# Unificar Ventas y Órdenes para clientes retail

## Decisión

Para clientes retail (Alma Bendita, Tissue), donde cada orden ya genera su venta automáticamente, **el sidebar solo mostrará "Órdenes"** y se ocultará "Ventas". Para clientes no-retail (Mind Coach, Speak Up, etc.) todo queda igual.

## Cambios

### 1. Sidebar (`src/components/dashboard/Sidebar.tsx`)

Cuando el cliente activo sea retail (Alma Bendita o Tissue):

- **Ocultar** la entrada "Ventas".
- **Mantener** la entrada "Órdenes" (ya existe).

Para usuarios agencia en modo edición sin preview, mantener ambas visibles para que puedan administrar la configuración. En **preview-mode** y en **clientes reales** retail, solo "Órdenes".

### 2. Página `/ordenes` (`src/pages/Ordenes.tsx`)

Convertir la página en el hub completo de revenue retail con tabs internos:

- **Tab "Órdenes"** (default) — la lista actual con filtros por estado.
- **Tab "Resumen"** — los widgets que hoy viven en `/ventas` y son útiles para retail:
  - `SalesGoalWidget` (meta mensual)
  - `RecentSalesTicker` (últimas ventas)
  - `UnifiedStoryRevenueTracker` (solo Alma Bendita: gráfico semanal volumen vs ingresos)
- **Tab "Clientes"** — atajo a Client Database filtrado por este cliente (link directo, no duplicar).

### 3. Página `/ventas` (`src/pages/Ventas.tsx`)

Si el cliente activo es retail y el usuario no es agencia:

- Redirigir automáticamente a `/ordenes` con `<Navigate to="/ordenes" replace />`.

Así, links viejos/bookmarks siguen funcionando sin error.

### 4. Memoria de proyecto

Actualizar `mem://features/ventas/orders-system` para reflejar que `/ordenes` es ahora la entrada única para retail y que `/ventas` redirige.

## Detalles técnicos

```text
Sidebar lógica:
  isRetail = isAlmaBendita || isTissue
  showVentas = (effectiveAgency && !isPreviewMode && !isRetail) || (!isRetail && flags.ventas_section)
  showOrdenes = isRetail && (effectiveAgency || flags.ventas_section)

/ordenes:
  <Tabs defaultValue="ordenes">
    <Tab "ordenes" /> (lista existente)
    <Tab "resumen" /> (SalesGoalWidget + StoryRevenueTracker + Ticker)
    <Tab "clientes" /> (link a /clientes)
  </Tabs>
```

No hay cambios de base de datos — todo es UI/navegación.

## Verificación

1. Como cliente Alma Bendita: sidebar muestra solo "Órdenes"; al entrar ve tabs Órdenes/Resumen/Clientes.
2. Como agencia viendo Alma Bendita en preview: idem (solo Órdenes).
3. Como cliente Mind Coach: sidebar igual que antes (solo "Ventas").
4. Visitar `/ventas` directo en Alma Bendita: redirige a `/ordenes`.
