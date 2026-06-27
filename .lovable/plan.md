## Objetivo

Crear un **frente CRM para vendedores** (setter/closer del cliente) separado del dashboard de agencia, donde cada vendedor solo ve los leads que tiene asignados y puede trabajarlos rápido: registrar venta, cambiar estado, dejar seguimiento. Los managers ven el mismo frente pero pueden filtrar por vendedor para supervisar.

No se toca nada del dashboard actual de agencia/cliente — esto es una pantalla nueva.

## Cómo se ve

### Para un vendedor (setter/closer)
- Ruta nueva: `/mis-leads` (o `/crm`)
- Al hacer login, si su único rol activo en el cliente es `setter`/`closer`, lo redirigimos por defecto a esta pantalla en vez de al dashboard general.
- Layout simple, mobile-first (la mayoría lo va a usar desde celular):
  - Header con su nombre, avatar, cliente activo y contador de "leads nuevos sin contactar".
  - Tabs/Filtros: **Nuevos** · **En seguimiento** · **Contactados** · **Ganados** · **Perdidos** · **Todos**.
  - Lista de tarjetas, cada una con: nombre del lead, teléfono (botón WhatsApp/llamar), modelo de camisa o info clave, fecha de entrada, estado actual.
  - Tocar una tarjeta abre el detalle (mismo dialog que ya existe en `InstantFormLeadDetailDialog` adaptado): cambiar estado, registrar venta (form CR con cantidad/bordado/subtotal/IVA), agregar nota de seguimiento.
- **Notificación de lead nuevo**:
  - Toast in-app vía Realtime (suscripción a `instant_form_leads` filtrada por `assigned_seller_id = auth.uid()`).
  - Badge rojo con conteo en el header.
  - Sonido opcional (toggle en perfil).
  - Notificación nativa del browser (con permiso) cuando la pestaña está en background.

### Para managers (owner/admin/manager de agencia o `account_manager` del cliente)
- Misma ruta `/mis-leads`, pero con un selector arriba "Ver como: **Todos los vendedores** / vendedor X / vendedor Y".
- Permite auditar la cola de cada vendedor sin tener que entrar al dashboard completo.
- Mismo dialog de detalle, con el extra de poder reasignar el lead a otro vendedor (ya respetado por el trigger `enforce_seller_assignment_permission`).

### Para el resto de roles
- No ven el link en el sidebar, no se redirigen ahí.

## Navegación / redirección al entrar

- Login → revisa roles:
  - Si es manager/admin/owner/account_manager → va al dashboard normal (como hoy), con un nuevo item en el sidebar "CRM de vendedores".
  - Si es solo `setter` o `closer` → redirige a `/mis-leads`. Item del sidebar "Mis leads" como única vista principal.
- En `/mis-leads`, si no tiene rol válido, redirige al dashboard normal.

## Datos y permisos

- Lee de `instant_form_leads` con filtro `assigned_seller_id = auth.uid()` para vendedores; sin filtro (o por vendedor seleccionado) para managers.
- Ya existe `assigned_seller_id`, auto-asignación round-robin y bloqueo de reasignación por trigger → no se cambia nada del schema.
- RLS actual de `instant_form_leads` ya restringe por cliente; agregar (si no existe) una policy SELECT para que un vendedor lea sus leads asignados aunque no tenga otros permisos del cliente. Lo confirmo en la migración antes de aplicarla.
- Realtime: habilitar publicación en `instant_form_leads` si todavía no está, para el toast en vivo.

## Detalles técnicos

```
src/pages/
  SellerCrm.tsx                 ← nueva página /mis-leads
src/components/seller-crm/
  SellerLeadCard.tsx            ← tarjeta compacta con CTA WhatsApp/llamar
  SellerLeadList.tsx            ← lista filtrable por estado
  SellerLeadDetailDialog.tsx    ← reutiliza lógica de InstantFormLeadDetailDialog
  SellerHeader.tsx              ← contador nuevos + selector de vendedor (managers)
  useSellerLeads.ts             ← query + realtime subscription
  useLeadNotifications.ts       ← Notification API + sonido
```

- Reutilizamos los hooks existentes en `use-instant-form-leads.ts` (sale CRUD, status update, parseFormSaleNotes).
- Sidebar: agregar item "Mis leads" visible cuando el usuario tiene rol setter/closer en el cliente activo, o rol manager en cualquiera.
- Routing: agregar `<Route path="/mis-leads" ...>` y lógica de redirect en el componente raíz / `ProtectedRoute`.

## Lo que NO cambia
- El dashboard de agencia y cliente actual queda igual.
- Widgets de Comfortex (volumen, modelos, ventas, etc.) no se tocan.
- Esquema de DB no cambia (solo confirmar policies + realtime).

## Preguntas para confirmar antes de implementar

1. **Nombre y ruta**: ¿`/mis-leads` está bien o prefieres `/crm`, `/vendedor`, otro?
2. **Alcance inicial**: ¿lo lanzamos solo para Comfortex (que es el único con `instant_form_leads` hoy) o lo dejamos genérico desde el inicio para cualquier cliente futuro?
3. **Notificaciones**: ¿quieres también email/WhatsApp cuando cae un lead nuevo, o por ahora solo in-app (toast + browser notification + badge)?
4. **Redirección al login**: si un usuario es setter en un cliente y también manager en otro, ¿priorizamos el CRM o el dashboard general?
