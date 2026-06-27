
## Objetivo

Dashboard mínimo para **Comfortex** con:
- Seguidores de Redes + Top Posts (Instagram / YouTube) — ya existen.
- **Nuevo widget**: Leads del Instant Form de Meta sincronizados desde Google Sheets.
- Cada lead se guarda también en **Client Database** (porque incluye nombre + teléfono).
- Resto de módulos ocultos vía feature flags.

## Qué necesito de vos (durante la implementación)

1. **Conectar Google Sheets** mediante el connector — te voy a pedir autorización una vez en build mode.
2. **Sheet ID + nombre de pestaña** donde caen los leads (el link del Google Sheet).
3. Confirmar que las columnas del sheet son las que listaste (`id, created_time, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name, form_id, form_name, is_organic, platform, ¿qué_modelo_de_camisa_está_buscando?, ¿cuántas_camisas_necesita?, ¿desea_que_las_camisas_tengan_algún_bordado?, ¿cuál_modelo_de_camisa_tipo_polo_prefiere?, ¿cuál_modelo_de_camisa_de_cuello_redondo_prefiere?, nombre_completo, número_de_teléfono, lead_status`).

## Cambios

### 1. Base de datos (migration)
- Tabla **`instant_form_leads`** (por cliente):
  - Campos fijos: `id`, `client_id`, `external_id` (id del sheet, unique por cliente), `created_time`, `ad_id`, `ad_name`, `adset_id`, `adset_name`, `campaign_id`, `campaign_name`, `form_id`, `form_name`, `platform`, `is_organic`, `full_name`, `phone`, `lead_status`.
  - `custom_answers jsonb` para las preguntas variables del formulario (modelo, cantidad, bordado, polo, cuello redondo, etc.).
  - `raw jsonb` con la fila completa por si agregan columnas.
  - `customer_contact_id` (FK a `customer_contacts`).
  - RLS por `has_client_access(auth.uid(), client_id)` + GRANTs (`authenticated`, `service_role`).
- Tabla **`instant_form_lead_sources`** (config por cliente):
  - `client_id`, `spreadsheet_id`, `sheet_name`, `header_row`, `last_synced_at`, `last_row_count`.
  - Mismo patrón RLS + GRANTs.
- Nuevo flag `instant_form_leads` (boolean default true) en `client_feature_flags`.

### 2. Edge function `sync-instant-form-leads`
- `verify_jwt = false` con validación de JWT en código.
- Lee `instant_form_lead_sources` del cliente, llama al gateway Google Sheets (`/spreadsheets/{id}/values/{tab}`), mapea encabezados → columnas conocidas, resto cae en `custom_answers`.
- Upsert por `(client_id, external_id)`.
- Para cada lead nuevo con `full_name` + `phone`, crea/actualiza `customer_contacts` y guarda el `customer_contact_id` en `instant_form_leads`.
- Actualiza `last_synced_at`.

### 3. UI — nuevo widget `InstantFormLeadsWidget`
Ubicación: `src/components/dashboard/InstantFormLeadsWidget.tsx`. Tres tabs internos:
1. **Tabla de leads recientes**: nombre, teléfono, fecha (CR UTC-6), campaña, ad, modelo solicitado, estado. Filtros por rango de fechas y campaña. Botón "Sincronizar ahora".
2. **Breakdown por UTM**: conteo y % por `campaign_name` / `adset_name` / `ad_name` (tabs internos o selector).
3. **Chart por día**: barras con leads/día en el rango seleccionado.

Hook `use-instant-form-leads.ts` con TanStack Query (`staleTime: 5m`, filtrado client-side por fecha).

### 4. Configuración por cliente (Business Setup)
Sección nueva en Business Setup: "Instant Form (Google Sheets)" → input para Spreadsheet ID + nombre de pestaña + botón "Sincronizar ahora" + última sincronización. Sólo visible cuando el flag `instant_form_leads` está activo.

### 5. Dashboard de Comfortex
- Edito `src/pages/Dashboard.tsx`: cuando `flags.instant_form_leads`, monto `<InstantFormLeadsWidget clientId=... />` después de Top Posts.
- Reemplaza visualmente el funnel/campaigns/content grid para Comfortex (ya los apaga por flags).

### 6. Feature flags de Comfortex
Insert/update en `client_feature_flags` para `client_id = d90a18b8-dad0-4f52-9447-c13f8f19f0d7`:
- **ON**: `dashboard`, `social_followers`, `instagram_posts`, `youtube_videos`, `instant_form_leads`, `business_setup_section`.
- **OFF**: todo lo demás (ventas, contenido, reportes, email marketing, asistencia, funnel, campaigns, content_grid, etc.).
- Client Database vive bajo Business Setup / Accesos según la app actual; los leads se acumulan ahí automáticamente.

### 7. Cron opcional (no en este plan, lo dejamos manual por ahora)
Sincronización manual con el botón. Si después querés, agregamos cron cada X minutos.

## Detalles técnicos

```text
Google Sheet
   │ (Meta Lead Ads → Zapier/Make → Sheet, ya existente)
   ▼
Edge function sync-instant-form-leads
   │   - Gateway: https://connector-gateway.lovable.dev/google_sheets/v4
   │   - Upsert por (client_id, external_id)
   │   - Sync a customer_contacts (Client Database)
   ▼
Tabla instant_form_leads  ─►  InstantFormLeadsWidget (3 tabs)
                          └►  Client Database (vía customer_contacts)
```

- Connector: `google_sheets` (gateway-enabled). Una sola conexión a nivel agencia alcanza para todos los clientes.
- Mapeo de columnas: normalizamos encabezados (minúsculas, sin tildes, espacios → `_`), comparamos con whitelist de campos fijos, resto al `custom_answers`.
- Manejo de errores del gateway: 4xx → mostramos error y no reintentamos; 429/5xx → backoff exponencial en el botón de sync.
- Sin polling automático: el widget recarga al montar (con caché de 5 min) y mediante el botón "Sincronizar".

## Riesgos / cosas a vigilar
- Si Comfortex luego cambia la estructura del form, los campos nuevos caen en `custom_answers` sin romper nada.
- El connector accede a la cuenta del workspace que lo autorice; el Sheet debe estar compartido con esa cuenta de Google.
- No agrego límites de rate al edge function (sólo se llama on-demand desde el botón).
