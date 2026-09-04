# Portal de clientes — archivado (2026-09-04)

El portal de clientes quedó descontinuado. La app es ahora **solo interna de la agencia**:
la raíz `/` muestra una portada con un único botón, el login solo deja pasar cuentas con rol
de agencia (`owner`, `admin`, `manager`, `media_buyer`, `closer`, `setter` en `user_roles`) y
todo lo demás vive bajo `/agencia`.

**Nada se borró en la base de datos.** Todas las tablas, políticas y datos siguen ahí, así que
revivir un widget cuesta una edición corta, no una reconstrucción.

## Dónde quedó el código

Las páginas se movieron sin modificar a `src/_archive/portal-cliente/`:

| Archivo archivado | Ruta original |
|---|---|
| `Dashboard.tsx` | `/dashboard` (dashboard de cliente completo) |
| `Ventas.tsx` | `/ventas` (pipeline, metas, cobros, historias) |
| `Ordenes.tsx` | `/ordenes` (OrderWizard retail) |
| `SpeakUpReportes.tsx` | `/reportes` (analítica Speak Up) |
| `Asistencia.tsx` | `/asistencia` (grid de asistencia) |
| `Comisiones.tsx` | `/comisiones` (comisiones de closers) |
| `BusinessSetup.tsx` | `/business-setup` (marca, productos, setters) |
| `SellerCrm.tsx` | `/mis-leads` (CRM de vendedores) |
| `MindCoachMasterclass.tsx` | `/masterclass` |
| `Historial.tsx` | `/historial` (audit log) |
| `SellerHomeGate.tsx` | bifurcación cliente/vendedor en `/dashboard` |

`src/_archive` está excluido del typecheck (`tsconfig.app.json` → `exclude`) y no se importa
desde ninguna ruta, así que no entra al bundle.

**Sí siguen vivos** (no se tocaron): todos los componentes en `src/components/dashboard/`,
`src/components/ventas/`, `src/components/comisiones/`, `src/components/inventory/`,
`src/components/business-setup/`, y todos los hooks (`use-kpi-data`, `use-sales-tracking`,
`use-orders`, `use-attendance`, `use-commissions`, `use-client-features`, etc.).
El shell `src/components/dashboard/DashboardLayout.tsx` conserva el sidebar de cliente
(`src/components/dashboard/Sidebar.tsx`) y el `TopBar`: si la ruta no empieza por `/agencia`,
sigue renderizando el chrome de cliente.

## Qué se conservó activo

`ClientDatabase` se movió a `src/pages/agencia/BasesDeDatosClientes.tsx` y vive en
`/agencia/bases-de-datos-clientes`, con su propio selector de cliente (usa `useBrand()`).
Es el único módulo del mundo cliente que quedó en producción.

## Cómo revivir una página completa

1. `mv src/_archive/portal-cliente/Ventas.tsx src/pages/Ventas.tsx`
2. En `src/App.tsx` agregá el lazy import y la ruta:
   ```tsx
   const Ventas = lazy(() => import("./pages/Ventas"));
   ...
   <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
   ```
   (borrá antes el `<Route path="/ventas" element={<Navigate to="/agencia" replace />} />`)
3. Opcional: agregá la entrada al menú (`src/components/dashboard/Sidebar.tsx` para el shell de
   cliente, o `src/components/agency/AgencySidebar.tsx` si la querés dentro de `/agencia`) y al
   mapa de precarga `src/lib/route-prefetch.ts`.

## Cómo revivir solo un widget

Los widgets nunca se movieron. Basta importarlos en cualquier página de agencia, por ejemplo:

```tsx
import { SalesTrackingSection } from '@/components/dashboard/SalesTrackingSection';
// necesita un cliente activo -> useBrand().selectedClient
```

Casi todos dependen de:
- `useBrand()` (`selectedClient`) para el `client_id`,
- `useClientFeatures(clientId)` para los feature flags (siguen en `client_feature_flags`, todos en `true`),
- su hook propio en `src/hooks/`.

## Cómo volver a abrir el acceso a clientes

1. `src/components/ProtectedRoute.tsx`: quitá la verificación `isAgency` (y el `signOut()` del
   efecto) para volver a permitir cuentas de cliente.
2. `src/components/RoleProtectedRoute.tsx`: el destino de rechazo volvería a ser `/dashboard`.
3. `src/pages/PortalSelect.tsx`: volvé a poner las dos tarjetas (Portal cliente → `/dashboard`,
   Portal agencia → `/agencia`).
4. `src/pages/Auth.tsx`: `nextPath` por defecto vuelve a `/dashboard` y se puede quitar el
   aviso de `?blocked=1`.
5. Restaurá `SellerHomeGate.tsx` a `src/components/` si querés la bifurcación vendedor/cliente.

## Datos que siguen intactos

`clients`, `client_team_members`, `client_feature_flags`, `client_invitations`, `message_sales`,
`orders`, `order_items`, `sales_goals`, `payment_collections`, `product_*`, `student_contacts`,
`customer_contacts`, `attendance_records`, `class_groups`, `closer_commissions`,
`commission_payouts`, `setter_appointments`, `setter_daily_reports`, `daily_story_tracker`,
`archived_stories`, `video_ideas`, `content_*`, `platform_connections`, `audit_logs`.
Ninguna política RLS cambió.
