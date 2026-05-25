## CRM interno para Lucía

Una sección nueva dentro de la agencia para registrar y dar seguimiento manual a leads (separado de `funnel_leads` que es del quiz público y `agency_leads` de formularios web).

### Acceso
- Ruta: `/agencia/crm`
- Visible solo para roles internos (`owner`, `admin`, `manager`). Lucía entra como `manager`.
- Entrada en el sidebar bajo "Agencia".

### Datos por lead
- Nombre *
- Correo
- Teléfono
- Estado de contacto (badge con color):
  - Nuevo
  - Contactado
  - En conversación
  - Agendado
  - Cliente
  - Perdido
- Información adicional (texto libre largo)
- Fecha de creación / última actualización
- Creado por (usuario)

### UI
1. **Lista principal** — tabla con buscador (nombre/correo/teléfono), filtro por estado, y conteo por estado arriba.
2. **Botón "Nuevo lead"** → diálogo con formulario.
3. **Click en fila** → diálogo de detalle/edición con todos los campos + botón eliminar.
4. **Cambio rápido de estado** desde un dropdown en la fila (sin abrir el diálogo).

### Backend
Tabla nueva `agency_crm_leads`:
- `id`, `name`, `email`, `phone`, `status` (enum), `notes`, `created_by`, `created_at`, `updated_at`
- RLS: solo roles internos de agencia (`is_agency_member`) pueden ver/crear/editar/borrar.

### Detalles técnicos
- Hook `use-agency-crm-leads.ts` con TanStack Query (list, create, update, delete).
- Validación con zod (email opcional pero válido, teléfono ≤ 30, notas ≤ 2000).
- Página `src/pages/AgencyCRM.tsx` + componentes en `src/components/agency-crm/`.
- Ruta agregada en `App.tsx` protegida con `RoleProtectedRoute`.

¿Le damos? Si querés ajustar los estados o agregar algún campo (ej: fuente del lead, etiquetas, fecha de seguimiento), decime antes de implementar.