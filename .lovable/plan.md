## Objetivo

Sacar todo lo de gestión interna del sidebar principal (que hoy convive con la vista del cliente) y meterlo en un **hub separado "CRM Agencia"** con su propio layout, más moderno y limpio. Un solo botón en el sidebar principal lleva ahí. Solo personal de agencia entra.

## Cambio de sidebar principal

Reemplazar todo el grupo "Gestión" (Clientes, Comunicaciones, Accesos, Widget Catalog, CRM Agencia, Producciones, Documentación, Archivos, Ajustes del Dashboard) por **un solo botón**:

- **CRM Agencia** → `/agencia`

Visible solo para `canManage && !isPreviewMode`. El resto del sidebar (Dashboard del cliente, Ventas, Client Database, etc.) queda igual, porque esa parte sí es vista de cliente.

## Nuevo hub `/agencia`

Layout propio con su sidebar interno y header, completamente separado del dashboard de cliente. Diseño moderno estilo panel de control interno:

```text
┌─────────────────────────────────────────────────────┐
│  ← Volver al dashboard    CRM Agencia   [usuario]   │
├──────────┬──────────────────────────────────────────┤
│ Resumen  │                                          │
│ Clientes │   Contenido de la sección activa         │
│ CRM      │                                          │
│ Producc. │                                          │
│ Docs     │                                          │
│ Finanzas │                                          │
│ Comunic. │                                          │
│ Accesos  │                                          │
│ Archivos │                                          │
│ Widgets  │                                          │
│ Ajustes  │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Rutas dentro del hub

Todo bajo `/agencia/*`, con `RoleProtectedRoute requireAgency`:

- `/agencia` → **Resumen** (nueva página, dashboard interno con KPIs de agencia: clientes activos, MRR, leads nuevos, hojas de producción en curso, propuestas pendientes)
- `/agencia/clientes` → hoy `/clientes`
- `/agencia/crm` → ya existe
- `/agencia/producciones` → ya existe
- `/agencia/documentacion` → ya existe
- `/agencia/finanzas` → ya existe
- `/agencia/comunicaciones` → hoy `/comunicaciones`
- `/agencia/accesos` → hoy `/accesos`
- `/agencia/archivos` → hoy `/archivos`
- `/agencia/widget-catalog` → hoy `/widget-catalog`
- `/agencia/ajustes` → hoy `/brand-settings`

Las rutas viejas (`/clientes`, `/comunicaciones`, `/accesos`, `/archivos`, `/widget-catalog`, `/brand-settings`) quedan como `<Navigate>` a las nuevas para no romper enlaces internos ni emails.

## Estilo visual del hub

Buscamos que se sienta "herramienta interna moderna", no "dashboard de cliente":

- Fondo más neutro / oscuro sutil que el dashboard del cliente (para separar visualmente los dos mundos).
- Sidebar interno colapsible tipo icon-rail (más compacto que el actual).
- Header slim con breadcrumb + acción rápida contextual por sección.
- Cards con radio 2xl, borders sutiles, sin gradientes ni acentos coloridos del branding del cliente activo.
- Tipografía y densidad más ajustada — pensado para uso interno diario, no demo.

**No** cambiamos el contenido funcional de cada sección — Clientes, CRM, Producciones, etc. siguen renderizando sus páginas actuales. Solo cambia el chrome (sidebar/header/layout wrapper) y se agrega la página de Resumen.

## Detalles técnicos

- Nuevo `src/layouts/AgencyLayout.tsx` que envuelve las rutas `/agencia/*` con sidebar interno + header propio. Usa un `<Outlet />`.
- Nuevo `src/components/agency/AgencySidebar.tsx` con la navegación interna.
- Nueva página `src/pages/agencia/Resumen.tsx` — KPIs agregados (queries reusando hooks existentes de clientes, sales, producciones, propuestas).
- En `src/App.tsx`: agrupar todas las rutas `/agencia/*` bajo el nuevo `AgencyLayout` (usando route nesting). Las rutas legacy (`/clientes`, etc.) se convierten en `<Navigate replace>` hacia sus contrapartes `/agencia/...`.
- En `src/components/dashboard/Sidebar.tsx`: eliminar `managementMenuItems` y el `SidebarGroup` de "Gestión"; agregar un único ítem "CRM Agencia" apuntando a `/agencia`, visible bajo la misma condición actual (`canManage && !isPreviewMode`). Mantener el botón "Vista Cliente" del owner/admin.
- El botón "Vista Cliente" ya no vive en Gestión: lo movemos al header del `AgencyLayout` cuando hay `selectedClient`.
- Tokens de color: agregar en `index.css` un par de variables scoped `.agency-shell { --background: ...; --card: ...; }` para el tono más neutro, sin tocar el design system global.
- No hay cambios de base de datos.

## Verificación

1. Navegar como usuario `agency` → sidebar muestra un solo botón "CRM Agencia".
2. Click → aterriza en `/agencia` con el Resumen y sidebar interno.
3. Cada ítem del sidebar interno abre la sección con la misma funcionalidad que hoy.
4. Rutas viejas redirigen sin romper enlaces.
5. Como usuario cliente (no agencia) → el botón "CRM Agencia" no aparece; visitar `/agencia` redirige por `RoleProtectedRoute`.
6. En modo `?preview=<clientId>` → el botón desaparece (comportamiento actual de Gestión).

## Fuera de alcance

- No se reescriben las páginas internas (Clientes, CRM, Producciones, etc.). Se cambia solo el marco y se agrega la página de Resumen.
- No se tocan permisos ni RLS.
- No se mueven las rutas públicas (`/propuesta/:slug`, `/reporte/:slug`, `/produccion-publica/:token`).
