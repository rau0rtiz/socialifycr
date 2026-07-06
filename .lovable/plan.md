## Objetivo

Reducir el ruido del sidebar quitando 5 entradas que aportan poco al día a día.

## Cambios

### 1. Asistencia — quitar del sidebar
- Eliminar el ítem "Asistencia" del menú principal en `src/components/dashboard/Sidebar.tsx`.
- Quitar la ruta `/asistencia` de `src/App.tsx` y del prefetch en `src/lib/route-prefetch.ts`.
- La página `src/pages/Asistencia.tsx` y sus componentes quedan en el repo por si se retoma, pero sin acceso desde la UI.

### 2. Widget Catalog — quitar del sidebar
- Eliminar el ítem "Widget Catalog" de `managementMenuItems`.
- La ruta `/widget-catalog` sigue existiendo (accesible por URL directa para admins que la necesiten puntualmente), pero deja de ocupar espacio en el menú de Gestión.

### 3. Historial — quitar del sidebar
- Eliminar el ítem "Historial" de `managementMenuItems`.
- La ruta `/historial` queda disponible por URL directa. Si más adelante quieres, puedo integrarlo como pestaña dentro de Accesos.

### 4. Reportes (Speak Up) — quitar del sidebar
- Eliminar el bloque condicional que agrega "Reportes" cuando el cliente activo es Speak Up.
- La ruta `/reportes` queda disponible por URL directa. En un paso posterior se puede fusionar su contenido como widgets dentro del Dashboard de Speak Up (fuera de este plan).

### 5. Frameworks / Masterclass (Mind Coach) — quitar del sidebar
- Eliminar el bloque condicional que agrega "Frameworks" cuando el cliente activo es Mind Coach.
- Las rutas `/masterclass` y `/ad-frameworks/:id` siguen funcionando por URL directa (siguen siendo necesarias porque Masterclass usa Ad Frameworks internamente).

## Lo que NO cambia

- Client Database se mantiene (no lo marcaste).
- Business Setup y Ajustes del Dashboard siguen separados (no lo marcaste).
- Producciones, CRM Agencia y Comunicaciones se mantienen en Gestión (no marcaste ninguna).
- No se borra código de páginas ni tablas de la base de datos — solo se ocultan del menú. Todo es reversible en minutos.

## Notas técnicas

- Todos los cambios viven en `src/components/dashboard/Sidebar.tsx` (5 ediciones) y opcionalmente `src/App.tsx` + `src/lib/route-prefetch.ts` para el caso de Asistencia.
- No hay migraciones ni cambios de backend.
- No se tocan feature flags de clientes (`asistencia_section`, etc.) — quedan en la base de datos por si se necesitan más adelante.
