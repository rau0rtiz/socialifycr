# Subdominio produ.socialifycr.com para Producciones

Objetivo: que `produ.socialifycr.com` muestre únicamente el módulo de Producciones (sin sidebar del dashboard, sin acceso a Ventas, Clientes, etc.), reutilizando el mismo proyecto Lovable, mismo login y mismos datos. `app.socialifycr.com` sigue funcionando igual.

## 1. DNS y dominio (acción del usuario, 1 sola vez)

En Project Settings → Domains → Connect domain, agregar `produ.socialifycr.com` apuntado al mismo proyecto (A record a `185.158.133.1` o CNAME si usa Cloudflare proxy). Lovable emite el SSL automáticamente. No se toca `app.socialifycr.com`.

## 2. Detección de host en la app

Crear `src/lib/host-mode.ts` con un helper:

- `isProduccionesHost()` → `true` si `window.location.hostname` empieza con `produ.` (también acepta `produ-preview…lovable.app` para poder previsualizar antes de publicar, y un override `?host=produ` solo en dev).
- Hook `useHostMode()` que expone `{ mode: 'producciones' | 'main' }`.

## 3. Router condicional (`src/App.tsx`)

Dentro de `<BrowserRouter>`, antes del `<Routes>` principal, ramificar por host:

- Si `mode === 'producciones'`:
  - Rutas permitidas: `/` → redirect a `/producciones`, `/producciones`, `/producciones/:sheetId`, `/auth`, `/reset-password`, callbacks OAuth (por si reusan login), y `*` → `NotFound`.
  - Sin `AppSidebar`, sin layout del dashboard. Mantenemos `AuthProvider`, `BrandProvider`, `ProtectedRoute` (mismos usuarios del dashboard pueden entrar).
- Si `mode === 'main'`: árbol de rutas actual sin cambios.

Las rutas internas pasan de `/agencia/producciones` a `/producciones` solo cuando el host es `produ.`; en el host principal se mantiene `/agencia/producciones` intacto.

## 4. Ajustes mínimos en Producciones

- En `Producciones.tsx` y `ProduccionSheet.tsx`: usar un helper `produccionesBasePath()` que devuelve `/producciones` o `/agencia/producciones` según host, para que los links internos (`navigate`, breadcrumbs, "← Volver") funcionen en ambos dominios.
- Ocultar el botón "← Volver al dashboard" cuando `mode === 'producciones'` (no hay dashboard al cual volver) y reemplazar por "← Carpetas".
- El logout del usuario sigue disponible (menú simple en el header de Producciones), redirige a `/auth` dentro del mismo subdominio.

## 5. Auth y datos

- Mismo `AuthProvider`, misma sesión Supabase. Como el subdominio es distinto (`produ.` vs `app.`), la cookie de sesión no se comparte automáticamente: cada subdominio requiere su propio login. Se documenta como comportamiento esperado.
- RLS y permisos no cambian: cualquiera con acceso al dashboard puede entrar a `produ.`.

## 6. SEO / metadata

Actualizar `index.html` con lógica mínima en runtime (set `document.title` dentro del layout de Producciones) a "Socialify · Producciones" cuando el host es `produ.`. No tocamos meta tags globales.

## Detalles técnicos

Archivos nuevos:
- `src/lib/host-mode.ts`
- `src/routes/ProduccionesOnlyRoutes.tsx` (subárbol de rutas para el subdominio)

Archivos a editar:
- `src/App.tsx` — branch por host antes de `<Routes>`.
- `src/pages/Producciones.tsx` — base path dinámico, título dinámico, ocultar volver-al-dashboard.
- `src/pages/ProduccionSheet.tsx` — base path dinámico en navigate/links.

Fuera de alcance: cambios de schema, edge functions, ClickUp, branding global, separar proyectos Lovable, cambiar el path en `app.socialifycr.com`.

## Checklist post-deploy

1. Publicar.
2. Conectar `produ.socialifycr.com` en Domains.
3. Esperar SSL activo.
4. Verificar: `produ.socialifycr.com/` redirige a `/producciones`, no aparece sidebar, intentar `/ventas` → NotFound.
5. Verificar que `app.socialifycr.com/agencia/producciones` sigue igual.
