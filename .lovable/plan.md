

## Plan: Mejorar popup de correo outbound y actualizar plantilla

### Cambios

**1. Ampliar el popup de correo (`SendCampaignDialog.tsx`)**
- Cambiar `max-w-2xl` a `max-w-4xl` para que el preview del email se vea con buen ancho
- Aumentar la altura del iframe de preview de `h-[300px]` a `h-[400px]`
- Cuando viene con `preselectedRecipients`, saltar directo al editor (ya lo hace) pero mostrar un banner compacto con el nombre del destinatario

**2. Actualizar la plantilla HTML en la base de datos (`email_templates` → slug `outbound-funnel-roadmap`)**
- Recolorizar con naranja Socialify (`#FF6B35` primary, `#FF8F5E` secondary)
- Agregar un botón de WhatsApp al final del email: "Escríbeme por WhatsApp" con link `https://wa.me/50688888888?text=...` (placeholder editable)
- El botón tendrá estilo verde WhatsApp (`#25D366`)
- Mejorar el diseño general: header con logo naranja, separadores, tipografía más limpia

**3. Hacer el cuerpo del email editable en el popup**
- Ya existe la pestaña "HTML" para editar código directo — esto ya funciona
- Agregar una tercera pestaña "Editar" entre Preview y HTML que muestre un editor visual simplificado: un `Textarea` con el texto plano extraído, más amigable que el HTML crudo
- Alternativamente, hacer que el tab de preview se convierta en un iframe editable o mantener las 2 pestañas existentes (preview + HTML) que ya permiten editar

### Detalle técnico
- La plantilla se actualiza vía migración SQL (`UPDATE email_templates SET html_content = ... WHERE slug = 'outbound-funnel-roadmap'`)
- El número de WhatsApp será un placeholder `{{whatsapp}}` en la plantilla que se puede personalizar
- No se requieren cambios de esquema de base de datos, solo UPDATE de contenido

### Archivos afectados
- `src/components/comunicaciones/SendCampaignDialog.tsx` — ampliar ancho del dialog y mejorar UX del editor
- Base de datos: `email_templates` — actualizar HTML de la plantilla `outbound-funnel-roadmap`

