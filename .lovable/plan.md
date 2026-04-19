

## Soporte de múltiples cuentas Meta por cliente (Tissue)

### Diagnóstico

Hoy el sistema asume **1 cliente = 1 conexión por plataforma**:

- Tabla `platform_connections`: aunque no tiene un UNIQUE explícito en `(client_id, platform)`, todo el código usa `.maybeSingle()` o `.find(c => c.platform === 'meta')` (ej: `useMetaConnection`, `useCampaignsData`, `usePlatformConnections`).
- El OAuth flow probablemente sobrescribe la conexión existente al conectar una segunda cuenta del mismo `platform`.
- Los widgets (campañas, insights, ads) leen **solo el primer ad_account_id** que encuentran.

Resultado: si conectás dos portafolios de Meta para Tissue, el segundo pisa al primero y los widgets solo muestran datos de uno.

### Lo que hay que implementar

#### 1. Permitir N conexiones del mismo platform por cliente
- **DB**: agregar `account_label` (text, nullable) a `platform_connections` para que el usuario nombre cada conexión ("Tissue Retail", "Tissue B2B"). No agregar UNIQUE en `(client_id, platform)`.
- **OAuth callback** (`meta-oauth/index.ts`): en lugar de upsert por `(client_id, platform)`, insertar siempre una nueva fila si el `ad_account_id` es distinto al de las conexiones existentes. Si el usuario reconecta la misma cuenta, sí actualizar.

#### 2. UI de gestión de múltiples cuentas
- **`PlatformConnections.tsx`**: mostrar **todas** las conexiones Meta del cliente como una lista (no una sola tarjeta). Botón "+ Conectar otra cuenta de Meta". Cada tarjeta permite renombrar (`account_label`), ver qué ad account/IG/page tiene, y desconectar individualmente.
- **`MetaAccountSelector.tsx`** (ya existe parcialmente): se reutiliza para que dentro de cada conexión el usuario elija qué Page/IG/AdAccount usar (Meta entrega múltiples por token, esto ya funciona).

#### 3. Widgets que agreguen datos de múltiples conexiones
- **`usePlatformConnections`**: ya devuelve un array, perfecto.
- **`useCampaignsData`** y `useMetaApi`: cambiar `connections.find(c => c.platform === 'meta')` por `connections.filter(...)`. Hacer el fetch en paralelo a cada conexión y **mergear** resultados:
  - Campañas: concatenar listas, agregar campo `_accountLabel` para distinguir en UI.
  - Insights agregados (reach, spend, leads): sumar entre cuentas.
  - Top posts / Stories: concatenar y reordenar por engagement.
- **Edge function `meta-api`**: aceptar `connectionId` opcional en el body. Si no viene, usa la primera (compatibilidad). Si viene, usa esa específica.

#### 4. Selector opcional de cuenta en widgets clave
En el `TopBar` o dentro del dashboard de Tissue, agregar un toggle pequeño: **"Todas las cuentas | Tissue Retail | Tissue B2B"** para que puedas filtrar la vista cuando quieras analizar una sola.
- Por defecto: "Todas" (datos sumados).
- Estado guardado en `sessionStorage` por cliente.

### Cambios concretos

**DB (1 migración):**
- `ALTER TABLE platform_connections ADD COLUMN account_label text;`
- Verificar que no exista UNIQUE en `(client_id, platform)`.

**Backend:**
- `supabase/functions/meta-oauth/index.ts`: cambiar lógica de upsert para permitir múltiples conexiones por client si `ad_account_id` difiere.
- `supabase/functions/meta-api/index.ts`: aceptar `connectionId` opcional para targeting específico.

**Frontend:**
- `src/components/clientes/PlatformConnections.tsx`: lista de conexiones Meta con renombrar/agregar/eliminar.
- `src/hooks/use-meta-api.ts`: `useMetaConnection` → `useMetaConnections` (plural). Mantener `useMetaConnection` como alias deprecado que devuelve la primera.
- `src/hooks/use-campaigns-data.ts`: fetch paralelo + merge.
- `src/hooks/use-content-data.ts`, `use-kpi-data.ts`, `use-ads-data.ts`: mismo patrón de merge.
- Nuevo: `src/components/dashboard/MetaAccountFilter.tsx` (toggle "Todas | cuenta A | cuenta B") + estado en `BrandContext` o sessionStorage.

### Qué te queda hacer manualmente
1. Crear cliente "Tissue" en `/clientes`.
2. Conectar la primera cuenta Meta (portafolio 1) → renombrarla "Tissue [nombre del portafolio]".
3. Click "+ Conectar otra cuenta de Meta" → autorizar el segundo portafolio → renombrarla.
4. Asignar Pages/IG/AdAccount correctos en cada conexión vía `MetaAccountSelector`.

### Notas técnicas
- Como vos ya tenés permisos en ambos portafolios desde tu mismo Facebook user, el OAuth flow estándar ya te permitirá conectar ambos sin cambios en scopes. El access_token será diferente por sesión OAuth (uno por click en "Conectar"), pero ambos funcionarán.
- LinkedIn / TikTok / YouTube siguen igual (1 por cliente), no necesitamos tocarlos a menos que pidás lo mismo después.
- Sin límite forzado: podrías conectar 3, 4, N cuentas si en el futuro Tissue agrega más portafolios.

### Dudas antes de implementar
1. **Filtro por cuenta en TopBar**: ¿lo querés visible siempre, o solo aparece cuando el cliente tiene >1 conexión Meta? (mi recomendación: solo si >1, para no agregar ruido visual a clientes single-account).
2. **Vista por defecto** cuando hay múltiples cuentas: ¿agregada (suma de todas) o requerir que selecciones una?

