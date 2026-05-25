# Capturar UTMs en el formulario de contacto del sitio

El sitio `socialifycr.com` vive en el otro proyecto Lovable **WEBSITE AGENCIA**. Ya inserta leads en `funnel_leads` del dashboard vía `submitContactLead`, pero no captura los parámetros UTM del URL. Voy a agregar esa captura, persistirla durante la navegación, y pasarla al `answers` JSON para que se vean tanto en el email como en el panel de Leads.

## Cambios en WEBSITE AGENCIA

### 1. Nuevo hook `src/hooks/use-utms.ts`
- Al montar, lee `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` del `window.location.search`.
- Si hay alguno, lo guarda en `sessionStorage` con clave `socialify_utms` (sobrescribe los previos).
- Siempre retorna el objeto leído desde `sessionStorage` (así sobreviven al scroll a `#contacto`, cambios de página, etc.).
- Helper exportado `getStoredUtms()` para uso fuera de React.

### 2. Actualizar `src/components/ContactForm.tsx`
- Usar `useUtms()` y mandar el resultado a `submitContactLead({ ..., utms })`.
- También pasar los UTMs al `fetch("/api/public/contact-notify", ...)` por si esa función los usa.

### 3. Actualizar `src/integrations/dashboard-supabase.ts`
- Agregar `utms?: Record<string, string>` al `ContactLeadInput`.
- En el `insert`, expandir los utms dentro de `answers` (junto a `source`, `kind`, `brand`, etc.):
  ```ts
  answers: { source, kind, brand, challenge, tried, ...(input.utms ?? {}) }
  ```

### 4. Inicialización temprana en `src/main.tsx` (o `App.tsx`)
- Llamar `getStoredUtms()` (que dispara la lectura+persist) lo antes posible para capturar UTMs aunque el usuario nunca abra el form en la primera visita pero rellene en otra.

## Cambios en el dashboard (este proyecto)

Ya está todo listo del lado del dashboard:
- El dialog de Leads en `AgencyLeadsContent.tsx` muestra el bloque "Atribución (UTMs)" cuando vienen en `answers`.
- El edge function `notify-website-contact` agrega un bloque morado con UTMs al email.

No requiere cambios.

## Fuera de alcance
- No tocar el diseño visual del formulario.
- No agregar nuevos campos UTM (solo los 5 estándar).
- No modificar lógica de `/api/public/contact-notify` más allá de pasarle utms.

## Verificación
Una vez aplicado, probar con: `https://socialifycr.com/?utm_source=instagram&utm_medium=bio&utm_campaign=mayo`. Llenar el formulario y confirmar que:
1. El correo a raul@socialifycr.com llega con el bloque morado de UTMs.
2. El lead en el dashboard (sección Comunicaciones → Leads → funnel "Página Web — Contacto") muestra el bloque morado al abrir el detalle.
