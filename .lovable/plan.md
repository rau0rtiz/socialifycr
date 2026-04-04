

# Plan: Nueva sección "Business Setup" en el menú lateral

## Resumen
Crear una nueva página `/business-setup` que centralice toda la configuración del negocio del cliente seleccionado: ajustes de marca (colores, logo), gestión de productos y equipo/accesos. Se agrega como item del menú principal debajo de Email Marketing.

## Cambios

### 1. Nueva página `src/pages/BusinessSetup.tsx`
- Página con `DashboardLayout` que muestra 3 secciones en tabs o cards apiladas:
  - **Marca del Cliente**: colores primario/acento, logo, industria (extraído de la lógica actual del `ClientDetailPanel`)
  - **Productos**: reutiliza el componente `ProductsManager` pasándole el `selectedClient.id`
  - **Equipo y Accesos**: reutiliza el componente `TeamMembers` del cliente seleccionado
- Depende del `selectedClient` del `BrandContext`; si no hay cliente seleccionado, muestra un estado vacío

### 2. Actualizar `Sidebar.tsx`
- Agregar "Business Setup" como nuevo item en la sección Principal, debajo de Email Marketing
- Icono: `Briefcase` o `Settings2` de lucide
- Visible para todos los usuarios (agency y clientes), sin restricción de feature flag por ahora
- URL: `/business-setup`

### 3. Actualizar `App.tsx`
- Agregar ruta `/business-setup` como `ProtectedRoute` (accesible para agency y clientes)
- Lazy-load del componente

### 4. Limpiar duplicados
- Remover `ProductsManager` de `Ventas.tsx` (ya vive en Business Setup)
- Mantener "Ajustes del Dashboard" en el menú de Gestión (es configuración de la plataforma Socialify, no del cliente)
- La ruta `/accesos` sigue existiendo para la gestión centralizada del owner; Business Setup muestra solo el equipo del cliente seleccionado

## Archivos a crear/modificar
- **Crear**: `src/pages/BusinessSetup.tsx`
- **Modificar**: `src/components/dashboard/Sidebar.tsx` (nuevo item de menú)
- **Modificar**: `src/App.tsx` (nueva ruta)
- **Modificar**: `src/pages/Ventas.tsx` (remover ProductsManager)

## Detalle técnico
- Reutilizar `ProductsManager` y `TeamMembers` tal cual, solo pasando `clientId` desde `useBrand().selectedClient`
- Para la sección de marca del cliente, crear un mini formulario inline que permita editar `logo_url`, `primary_color`, `accent_color` e `industry` directamente en la tabla `clients` via Supabase update
- No se requieren cambios de base de datos

