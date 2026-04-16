

## Plan: Cards compactos, clickeables, con email outbound y delete en popup

### Cambios en `src/components/comunicaciones/AgencyLeadsContent.tsx`

**1. Quitar el botón "Ver detalle"**
- Eliminar el `<Button>` de "Ver detalle" que aparece en hover (líneas 374-377)

**2. Hacer el card entero clickeable**
- Envolver el `<Card>` con `onClick={() => setSelectedLead(lead)}` para que cualquier click abra el popup de detalle

**3. Cards más compactos**
- Reducir padding de `p-5` a `p-4`, reducir espaciado vertical entre secciones

**4. Quitar el checkbox de selección**
- Eliminar el `<Checkbox>` de cada card (líneas 323-329)
- Eliminar el botón "Eliminar (N)" del header y toda la lógica de `selectedIds`, `toggleSelect`, `toggleSelectAll`
- Eliminar el `AlertDialog` de confirmación de borrado masivo

**5. Agregar botón de email outbound en cada card**
- Agregar un icono de `Mail` como botón pequeño en la esquina superior derecha del card
- Al hacer click (con `e.stopPropagation()` para no abrir el popup), abre el `SendCampaignDialog` pre-cargado con ese lead como único destinatario y la plantilla "outbound-funnel-roadmap"

**6. Agregar botón de eliminar dentro del popup de detalle**
- En el `Dialog` de detalle del lead, agregar un botón "Eliminar lead" al final
- Al confirmar, elimina el lead individual, cierra el popup, e invalida queries

### Archivos afectados
- `src/components/comunicaciones/AgencyLeadsContent.tsx` — único archivo modificado

