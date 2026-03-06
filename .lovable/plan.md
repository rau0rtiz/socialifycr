

## Plan: Feature Flags por Cliente + Módulo de Ventas por Mensajes

Este es un plan grande con 3 partes principales: (1) crear cliente Alma Bendita, (2) sistema de feature flags por cliente, (3) nuevo módulo de tracking de ventas.

---

### Parte 1: Crear cliente "Alma Bendita"

Insertar un nuevo registro en la tabla `clients` con nombre "Alma Bendita" usando el insert tool.

---

### Parte 2: Sistema de Feature Flags por Cliente

#### Base de datos

Crear tabla `client_feature_flags` con columnas:
- `id` (uuid, PK)
- `client_id` (uuid, FK a clients, unique)
- `dashboard` (boolean, default true)
- `social_followers` (boolean, default false)
- `instagram_posts` (boolean, default false)
- `youtube_videos` (boolean, default false)
- `content_grid` (boolean, default false)
- `ai_insights` (boolean, default false)
- `video_ideas` (boolean, default false)
- `competitors` (boolean, default false)
- `funnel` (boolean, default false)
- `campaigns` (boolean, default false)
- `sales_tracking` (boolean, default false)
- `created_at`, `updated_at`

RLS: agency (admin+) can manage, team members can view their client's flags.

#### UI en página de Clientes (agency master dashboard)

Agregar un panel/tab en el detalle de cliente (`ClientDetailPanel` o `ClientDetailDialog`) con toggles (switches) para cada sección. Solo visible para usuarios agency.

#### Lógica en Dashboard

Crear hook `use-client-features.ts` que obtiene los feature flags del cliente seleccionado. En `Dashboard.tsx`, envolver cada sección con condicional basado en los flags. Si no existe registro de flags para un cliente, usar defaults (todo apagado excepto dashboard).

---

### Parte 3: Módulo de Ventas por Mensajes (Sales Tracking)

#### Base de datos

Crear tabla `message_sales`:
- `id` (uuid, PK)
- `client_id` (uuid, FK a clients)
- `created_by` (uuid, user que registró)
- `sale_date` (date)
- `amount` (numeric)
- `currency` ('CRC' | 'USD')
- `source` ('story' | 'ad' | 'referral' | 'organic' | 'other')
- `ad_campaign_id` (text, nullable - ID de campaña de Meta cuando source='ad')
- `ad_campaign_name` (text, nullable)
- `ad_id` (text, nullable - ID del anuncio específico)
- `ad_name` (text, nullable)
- `customer_name` (text, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at`

RLS: team members con acceso al cliente pueden CRUD.

#### Componentes UI

1. **`SalesTrackingSection.tsx`** - Componente principal en el dashboard:
   - Resumen mensual: total ventas, monto total (CRC/USD), ROAS vs gasto en ads
   - Tabla/lista de ventas registradas con filtros por mes
   - Botón "Registrar Venta" que abre formulario

2. **`RegisterSaleDialog.tsx`** - Formulario para registrar venta:
   - Monto + selector de moneda (CRC/USD)
   - Fecha de la venta
   - Dropdown de fuente: Historia, Publicidad, Referencia, Orgánico, Otro
   - Si selecciona "Publicidad": dropdown con campañas y anuncios activos (del hook `useCampaigns` existente)
   - Campo opcional: nombre del cliente, notas

3. **`SalesSummaryCards.tsx`** - Cards de resumen:
   - Total ventas del mes
   - Monto total
   - ROAS calculado (ventas atribuidas a ads / gasto en ads)
   - Comparación con mes anterior

4. **Hook `use-sales-tracking.ts`**:
   - CRUD de ventas
   - Queries con filtro por mes
   - Cálculo de ROAS (suma de ventas con source='ad' / gasto total de campañas)

#### Integración en Dashboard

Agregar `SalesTrackingSection` como nueva sección en `Dashboard.tsx`, controlada por el feature flag `sales_tracking`. Para Alma Bendita, activar este flag.

#### Ruta en Sidebar

Agregar entrada "Ventas" en el sidebar, visible solo si el cliente tiene el flag `sales_tracking` activo.

---

### Archivos a crear/modificar

**Nuevos:**
- Migration SQL: `client_feature_flags` + `message_sales` tables
- `src/hooks/use-client-features.ts`
- `src/hooks/use-sales-tracking.ts`
- `src/components/dashboard/SalesTrackingSection.tsx`
- `src/components/dashboard/RegisterSaleDialog.tsx`
- `src/components/clientes/ClientFeatureFlags.tsx`

**Modificar:**
- `src/pages/Dashboard.tsx` - envolver secciones con feature flags
- `src/components/dashboard/Sidebar.tsx` - agregar item "Ventas" condicional
- `src/components/clientes/ClientDetailDialog.tsx` o `ClientDetailPanel.tsx` - agregar tab de feature flags
- `src/App.tsx` - agregar ruta `/ventas` si se hace página separada

---

### Datos adicionales que podrian ser utiles

Campos adicionales para el tracking de ventas por mensajes:
- **Producto/servicio vendido** (texto libre o catálogo)
- **Plataforma del mensaje** (WhatsApp, Instagram DM, Messenger) - para saber de dónde viene la conversación
- **Estado de la venta** (completada, pendiente, cancelada) - para tracking de pipeline

Incluiré estos campos opcionales en la tabla para mayor flexibilidad.

