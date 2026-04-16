
## Plan: Popup outbound del funnel más útil, contextual y fácil de enviar

### Hallazgos
- El popup actual solo reemplaza `{{name}}` y `{{email}}`, así que el preview y el envío no usan industria, objetivo, canal de ventas, pauta ni contexto del lead.
- En el flujo del icono de correo, el modal salta al paso 2 pero el preview ocupa mucho alto y el iframe puede atrapar scroll; eso hace que avanzar o confirmar se sienta “pegado” en ese paso.
- La mayoría de leads actuales no tienen `challenge` guardado explícitamente, así que para esos casos hay que inferir el reto principal desde sus respuestas.

### Qué voy a cambiar

**1. Mejorar `SendCampaignDialog.tsx` para el flujo del icono de correo**
- Crear un modo especial para lead preseleccionado desde Funnels: más simple, más visual y con menos fricción.
- Dejar como experiencia principal:
  - asunto editable
  - mensaje principal editable
  - preview real y ancho
  - envío claro y accesible
- Mantener la edición HTML como opción avanzada, no como flujo principal.

**2. Hacer que el preview sea real**
- Resolver el preview con los datos reales del lead seleccionado, no con valores dummy.
- Mostrar un email a buen ancho dentro del modal.
- Hacer el footer más accesible y evitar que el iframe bloquee el scroll del popup.
- Asegurar que el mismo motor de reemplazo se use para:
  - vista previa
  - confirmación
  - envío final

**3. Usar contexto específico del negocio basado en sus respuestas**
- Construir un mapper de contexto del lead usando:
  - `name`, `email`
  - `industry`, `revenue_range`, `business_level`
  - `answers.presencia`, `answers.pauta`, `answers.canalVentas`, `answers.objetivo`
  - `challenge` si existe
- Si `challenge` no existe, generar un “reto principal detectado” a partir de sus respuestas.
- Exponer placeholders útiles para la plantilla, por ejemplo:
  - `{{industry}}`
  - `{{business_level_name}}`
  - `{{revenue_range_label}}`
  - `{{goal_label}}`
  - `{{sales_channel_label}}`
  - `{{challenge_summary}}`
  - `{{context_summary}}`
  - `{{custom_intro}}`

**4. Actualizar la plantilla `outbound-funnel-roadmap`**
- Ajustar el copy para reflejar exactamente esta oferta:
  - llamada gratuita de planificación de 1 hora
  - salen con un plan para 90 días
  - se llevan dirección y claridad
  - en la llamada entendemos el contexto completo del negocio, los principales retos y los pasos a seguir
  - el plan es suyo, sea que lo ejecuten con Socialify o no
- Cambiar el CTA para que sea escribir por WhatsApp para coordinar la llamada, no agendar directo.
- Fijar el botón a `+50660173431`.
- Mantener el estilo naranja Socialify/roadmap.

**5. Ajustar `AgencyLeadsContent.tsx`**
- Pasar al popup el lead completo desde el icono de correo, no solo `id/name/email`, para que la personalización tenga toda la data desde el primer render.
- Mantener este flujo optimizado específicamente para el botón de correo del grid de funnels.

### Archivos afectados
- `src/components/comunicaciones/SendCampaignDialog.tsx`
- `src/components/comunicaciones/AgencyLeadsContent.tsx`
- opcional de consistencia futura: `src/pages/Funnel.tsx`
- migración SQL para actualizar `email_templates` con el nuevo HTML/copy de `outbound-funnel-roadmap`

### Detalle técnico
- No hace falta cambiar el esquema de base de datos.
- Sí hace falta actualizar la plantilla persistida en la base de datos.
- Voy a unificar la lógica de merge/reemplazo de variables para que preview y envío siempre coincidan.
- Para no romper leads viejos, la personalización leerá tanto columnas top-level como `answers`.
- El “challenge” seguirá esta prioridad:
  1. `lead.challenge` si existe  
  2. resumen inferido desde presencia + pauta + canal de ventas + objetivo
