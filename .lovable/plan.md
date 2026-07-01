## Widget: Duración Promedio por Estado del Lead

Mide cuánto tiempo pasa un lead en cada estado del pipeline (`nuevo → contactado → seguimiento → venta/perdido`) para Comfortex.

### Problema
Hoy `instant_form_leads.lead_status` sólo guarda el estado actual — no hay historial de cambios, así que no se puede calcular duración por etapa. Hay que empezar a registrar cada transición.

### Cambios en base de datos
Migración que crea:

1. **Tabla `instant_form_lead_status_history`**
   - `id uuid pk`, `lead_id uuid fk`, `client_id uuid fk`, `from_status text`, `to_status text`, `changed_at timestamptz default now()`, `changed_by uuid`
   - Índices por `(lead_id, changed_at)` y `(client_id, changed_at)`
   - RLS: SELECT/INSERT para team del cliente (via `has_client_access`), full para `service_role`
   - GRANTs correspondientes

2. **Trigger `AFTER INSERT OR UPDATE OF lead_status`** en `instant_form_leads`
   - INSERT nuevo lead → registra transición `null → <estado inicial>` con `changed_at = created_time` (o `now()`)
   - UPDATE con cambio de estado → registra `old → new`

3. **Backfill inicial** (una sola vez)
   - Para cada lead existente inserta una fila `null → <estado_actual>` con `changed_at = created_time`. Esto nos da al menos el punto de partida; las duraciones reales por etapa se irán calculando a medida que ocurran nuevas transiciones.

### Widget nuevo
`src/components/dashboard/ComfortexStageDurationWidget.tsx`

- Hook `useInstantFormLeadStatusHistory(clientId)` que trae el historial (últimos 1000 eventos)
- Calcula, por cada par consecutivo del mismo lead, el delta de tiempo
- Agrupa por transición: `Nuevo → Contactado`, `Contactado → Seguimiento`, `Seguimiento → Venta`, `Seguimiento → Perdido`, `Contactado → Perdido`
- Muestra por cada una:
  - Promedio y mediana (formato inteligente: min/horas/días)
  - Cantidad de transiciones usadas
  - Barra visual comparativa
- Selector de rango como los otros widgets (`Todo` default, `Hoy`, `Este mes`, `Mes pasado`, `7/30/90 días`) filtrado por `changed_at` de la transición de destino
- Estado vacío claro: "Empezamos a medir desde hoy — vuelve en unos días para ver duraciones reales."

### Ubicación en Dashboard
En el bloque Comfortex, en fila con `ComfortexCloseTimeWidget` (grid 2 columnas), justo después de `InstantFormSalesWidget`.

### Archivos técnicos
- Migración nueva (tabla + trigger + backfill + RLS + GRANTs)
- Nuevo hook en `src/hooks/use-instant-form-leads.ts` (o archivo aparte)
- Nuevo: `src/components/dashboard/ComfortexStageDurationWidget.tsx`
- Editar: `src/pages/Dashboard.tsx` para insertarlo

### Nota sobre datos históricos
No se puede reconstruir duraciones pasadas con precisión porque nunca se guardaron los cambios. Desde el momento en que se despliegue esta migración, cada transición futura queda registrada y el widget se irá poblando naturalmente.
