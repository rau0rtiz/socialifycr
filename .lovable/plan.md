

Usuario pregunta "que más" — quiere las siguientes optimizaciones después de los 3 quick wins ya aplicados (fonts preconnect, límite 50 posts, fix métrica IG views).

Mirando los network requests reales del dashboard de Alma Bendita: **18 queries en paralelo al cargar `/`**. Eso es lo que más duele. Muchas devuelven arrays vacíos `[]` (content_metadata, content_tags, video_ideas, client_setters, setter_appointments, content_models) — siguen costando round-trip aunque no haya datos.

Patrones detectados:
1. **2 queries duplicadas a `user_roles`** (mismo user_id, mismo select) en el mismo segundo → desperdicio.
2. **Prefetch masivo en SplashScreen** (15 queries) + queries adicionales que disparan los hooks al montar widgets → algunas se duplican.
3. **Sin code-splitting**: `Dashboard.tsx` importa todos los widgets directamente, no usa `React.lazy`. Bundle inicial grande.
4. **Fetches innecesarios cuando feature flag está OFF**: el flag de Alma Bendita tiene casi todo en `false` (sales_tracking, content_grid, etc.) pero igual se hace prefetch de `message_sales`, `video_ideas`, `content_metadata`, `setter_appointments`, etc. en el splash.
5. **`message_sales` sin paginación**: trae todas las ventas históricas (`select=*`).
6. **Logo grande**: PetShop2GoCR usa una imagen de 1.5MB+ desde wordpress sin optimizar.

Voy a presentar 5 optimizaciones priorizadas por impacto/esfuerzo.

## Plan: Siguientes optimizaciones del dashboard

### Contexto medido (Alma Bendita, ruta `/`)
- 18 queries Supabase en paralelo al cargar.
- 6 de esas queries devuelven `[]` (datos vacíos).
- 2 queries duplicadas a `user_roles`.
- Prefetch en SplashScreen ignora feature flags → trae datos de módulos apagados.

---

### 1. Prefetch condicionado por feature flags (alto impacto)
**Archivo:** `src/components/SplashScreen.tsx`

Hoy el splash precarga 15 queries para todos los clientes por igual. Para clientes como Alma Bendita (con `sales_tracking`, `content_grid`, `video_ideas` en `false`) eso es trabajo desperdiciado.

**Cambio:** Cargar primero `client_feature_flags`, luego prefetch SOLO de los datasets cuyos flags estén activos:
- `message_sales` solo si `sales_tracking || ventas_section`
- `video_ideas` solo si `video_ideas`
- `content_metadata`, `content_tags`, `content_models` solo si `contenido_section || content_grid`
- `setter_appointments`, `client_setters` solo si `setter_tracker || setter_daily`
- `client_competitors` solo si `competitors`

**Impacto esperado:** 8-12 queries menos por cliente en clientes con flags acotados.

---

### 2. Eliminar queries duplicadas a `user_roles`
**Archivos:** `src/hooks/use-user-role.ts` + componentes que llaman a `user_roles` directamente.

Hay 2 GET idénticos a `user_roles` en el mismo segundo. Auditar quién las dispara y consolidar todo a `useUserRole` con TanStack Query (ya cacheado 10min). Buscar `from('user_roles')` en el código y reemplazar llamadas directas por el hook.

---

### 3. Code-splitting de widgets pesados
**Archivo:** `src/pages/Dashboard.tsx`

Convertir a `React.lazy()` los widgets que están bajo el fold o detrás de feature flags:
- `AdvancedFunnelModule`, `FunnelModule`
- `CampaignsTable`, `CampaignsDrilldown`
- `AIInsightsPanel`
- `ContentGrid`, `ContentCalendar`, `StoriesSection`
- `AdSalesRanking`, `SalesByBrandChart`, `SalesByProductChart`
- `CompetitorsPanel`

Envolver cada uno en `<Suspense fallback={<Skeleton />}>`. Reduce el bundle inicial de Dashboard significativamente.

---

### 4. Paginar / limitar `message_sales`
**Archivo:** `src/components/SplashScreen.tsx` y hooks de ventas.

Hoy: `select('*').order('sale_date desc')` sin límite → trae historial completo. Limitar a últimos 90 días o `.limit(200)` en la carga inicial; widgets que necesiten más historial (reportes, story tracker) que hagan su propio fetch bajo demanda.

---

### 5. Optimizar logos de clientes (medio impacto, fácil)
**Archivos:** `ClientSelector`, `ClientBanner`, `Sidebar`.

Logos como el de PetShop2GoCR (PNG 1MB+ desde WordPress) se cargan en sidebar y banner. Agregar:
- `loading="lazy"` y `decoding="async"` en `<img>` de logos secundarios.
- Para logos del cliente activo: limitar tamaño con `width`/`height` explícito y `object-fit: contain` (ya está).
- Sugerencia futura: subirlos al storage propio con resize.

---

### Notas
- Estos cambios son de bajo a medio riesgo, todos backwards-compatible.
- El #1 y #3 son los de mayor impacto en tiempo de carga percibido.
- Después de aplicar, vale correr otro `performance_profile` para medir mejora real.
- No incluyo refactors estructurales mayores (virtualización, SSR, etc.) — eso va en una segunda fase si hace falta.

¿Aplico los 5? ¿O priorizamos solo #1 y #3 que son los de mayor impacto?

