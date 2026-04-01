

## Análisis: ¿Qué ya tenemos vs qué falta?

Ya tienen un sistema bastante completo. Aquí el desglose:

### Lo que YA existe

| Funcionalidad | Estado |
|---|---|
| Setter Pipeline con leads, estados, vendedores | ✅ Completo |
| Fuente del lead (ads, orgánico, referencia) | ✅ Completo |
| Conversión lead → venta con prefill | ✅ Completo |
| Show Rate y Close Rate generales | ✅ Completo |
| Cierre por vendedor (pie chart) | ✅ Completo |
| No Show tracking | ✅ Completo |
| Registro de ventas con atribución a anuncio | ✅ Completo |
| Productos vinculados a leads | ✅ Completo |
| Ventas por producto (pie chart) | ✅ Completo |
| Meta del lead (lead_goal) | ✅ Completo |

### Lo que FALTA implementar

| Funcionalidad | Esfuerzo |
|---|---|
| **Campo "fecha de llamada de venta"** en setter_appointments | Bajo — agregar columna `sales_call_date` a la tabla y al formulario |
| **Vista compacta del pipeline** (solo nombre + fecha de llamada) | Medio — rediseñar `renderLeadCard` para mostrar solo nombre y fecha, con click para abrir popup |
| **Popup de detalle del lead** al hacer click en el nombre | Medio — crear un `LeadDetailDialog` con toda la info actual del lead |
| **Conteo de conversaciones desde pauta** vs orgánicas | Bajo — ya tienen el campo `source`, solo falta un widget de resumen visual (ads vs organic vs referral) |
| **Ventas por closer (vendedor)** | Bajo — cruzar `message_sales` con el `setter_name` del appointment vinculado, o agregar campo `closer_name` a ventas |
| **Métricas avanzadas de Show Rate** desglosadas por vendedor/closer | Bajo — extender la lógica de stats existente |

### Plan de implementación

1. **Migración DB**: Agregar columna `sales_call_date` (timestamp) a `setter_appointments`
2. **Formulario de lead**: Agregar campo "Fecha de llamada de venta" al paso 1 o 2 del `AppointmentFormDialog`
3. **Vista compacta del pipeline**: Cambiar las tarjetas de lead para mostrar solo nombre + fecha de llamada + badge de estado. Al hacer click en el nombre → abrir popup
4. **LeadDetailDialog**: Nuevo componente popup con toda la info del lead (teléfono, email, producto, meta, anuncio, notas, valor estimado, historial de estados)
5. **Widget de origen de leads**: Mini card que muestre "X de pauta | Y orgánicos | Z referencia" con barras proporcionales
6. **Agregar campo `closer_name`** a `message_sales` para trackear quién cerró la venta (o derivarlo del setter_appointment vinculado)
7. **Tab "Ventas por Closer"**: Tabla/chart que agrupe ventas por closer con montos y tasa de cierre

### Resumen

Aproximadamente un **60-70% ya está construido**. Lo principal que falta es:
- El campo de fecha de llamada de venta
- Simplificar la vista del pipeline (nombre + fecha, click → popup)
- Un desglose visual de origen de conversaciones
- Métricas de ventas por closer

¿Quieres que proceda con la implementación completa?

