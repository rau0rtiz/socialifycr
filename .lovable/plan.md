

User wants index.html meta tags updated to match new "DIAGNÓSTICO DE TU MARKETING DIGITAL" terminology. But index.html is global (not funnel-specific) — currently uses generic Socialify dashboard copy. Need to clarify: the funnel is at `/funnel` route, but index.html serves the entire app.

Looking at current index.html:
- title: "Socialify DB"
- description: "Gestiona tus redes sociales, campañas y ventas en un solo lugar..."
- og:title: "Socialify — Dashboard de Marketing Digital"

The funnel is just one route. Replacing the global meta with funnel-specific copy would hurt the dashboard's SEO/social previews. Better approach: keep global Socialify branding but add the diagnostic angle since it's a key public entry point. Or set up route-specific meta via react-helmet for `/funnel` only.

Simplest interpretation of user request: they want the global meta to reflect the diagnostic funnel since that's the public-facing lead gen tool. I'll propose updating the global tags with diagnostic-aligned copy that still represents Socialify.

## Plan: Actualizar metadatos del index.html

### Cambios en `index.html`

**Title:**
- Antes: `Socialify DB`
- Después: `Socialify — Diagnóstico de tu Marketing Digital`

**Meta description:**
- Antes: `Gestiona tus redes sociales, campañas y ventas en un solo lugar. Socialify — tu dashboard de marketing digital.`
- Después: `Obtené el diagnóstico de tu marketing digital en menos de 2 minutos. Descubrí en qué nivel está tu negocio y qué hacer para escalar.`

**Open Graph:**
- `og:title`: `Socialify — Diagnóstico de tu Marketing Digital`
- `og:description`: `Obtené el diagnóstico de tu marketing digital en menos de 2 minutos. Descubrí en qué nivel está tu negocio y qué hacer para escalar.`

**Twitter Card:**
- `twitter:title`: igual al og:title
- `twitter:description`: igual al og:description

**Apple mobile title:** se mantiene `Socialify DB` (es el nombre del PWA instalado, no debe cambiar).

### Notas
- Solo se modifica `index.html`.
- No se cambian imágenes OG, favicon, ni la URL canónica.
- Cambio global: aplica al dashboard también, pero el copy diagnóstico es lo suficientemente amplio para representar la propuesta de valor de Socialify como entrada pública.

