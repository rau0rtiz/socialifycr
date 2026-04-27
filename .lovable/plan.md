
# Referencias con preview embebido en Ad Frameworks

## Objetivo
Agregar un **panel de Referencias** dentro de cada framework donde se peguen URLs (YouTube, Shorts, Reels/Posts de IG, videos de Facebook, TikTok, LinkedIn, X, Vimeo, Loom, etc.) y se renderice automáticamente un **preview embebido** del video/post.

## 1. Base de datos
Nueva tabla `ad_framework_references` (a nivel framework, biblioteca reutilizable):
- `id`, `framework_id`, `url`, `platform`, `embed_url`, `title`, `notes`, `thumbnail_url`, `position`, `created_by`, timestamps.
- RLS igual que `ad_framework_dimensions` (solo agency members ven/editan).

## 2. Detección + transformación a embed (cliente)
Helper `src/lib/embed-url.ts` con `parseReferenceUrl(url)` que devuelve `{ platform, embedUrl, canEmbed }`. Soporta:

| Plataforma | Detección | Embed |
|---|---|---|
| YouTube (watch / youtu.be / shorts) | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID` | `youtube.com/embed/ID` |
| Instagram (post/reel/tv) | `instagram.com/(p\|reel\|tv)/CODE` | `instagram.com/p/CODE/embed` |
| TikTok | `tiktok.com/@user/video/ID` o `vm.tiktok.com/...` | `tiktok.com/embed/v2/ID` |
| Facebook | `facebook.com/.../videos/ID`, `fb.watch/ID`, `facebook.com/reel/ID` | `facebook.com/plugins/video.php?href=<encoded>` |
| LinkedIn | `linkedin.com/posts/...activity-ID` | `linkedin.com/embed/feed/update/urn:li:activity:ID` |
| X / Twitter | `(twitter\|x).com/user/status/ID` | blockquote oficial + `widgets.js` |
| Vimeo | `vimeo.com/ID` | `player.vimeo.com/video/ID` |
| Loom | `loom.com/share/ID` | `loom.com/embed/ID` |
| Otro | fallback | tarjeta con link + favicon (sin iframe) |

## 3. Hook nuevo `use-ad-references.ts`
- `useAdReferences(frameworkId)`, `useCreateAdReference()` (parsea URL al insertar), `useUpdateAdReference()`, `useDeleteAdReference()`.

## 4. UI: nueva sección "Referencias" en `AdFrameworkDetail.tsx`
Insertarla **debajo de Dimensiones overview y arriba de Campañas**:
- Header `🔗 Referencias` + contador + botón "+ Agregar referencia".
- Input para pegar URL + textarea opcional para nota; **preview en vivo** del embed antes de guardar.
- Grid responsivo (1/2/3 cols) de tarjetas con:
  - **iframe embebido** con aspect-ratio según plataforma (9:16 para Reels/Shorts/TikTok, 16:9 para YT/FB/Vimeo/Loom, square para IG posts).
  - Badge de plataforma con color de marca.
  - Nota editable inline.
  - Botón eliminar (hover) y "Abrir original".
- iframes con `sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"` y `loading="lazy"`.
- X/Twitter usa blockquote + script (`widgets.js` cargado una vez).

## 5. Componentes nuevos
- `src/components/ad-frameworks/ReferencesPanel.tsx`
- `src/components/ad-frameworks/ReferenceCard.tsx`
- `src/components/ad-frameworks/ReferenceEmbed.tsx`

## 6. Fuera de scope (para próxima iteración)
Botón "Importar de biblioteca" dentro del editor de variantes para reutilizar las referencias guardadas a nivel framework.

## Archivos a crear/modificar
- **Nuevo:** migración SQL `ad_framework_references` + RLS
- **Nuevo:** `src/lib/embed-url.ts`
- **Nuevo:** `src/hooks/use-ad-references.ts`
- **Nuevo:** `src/components/ad-frameworks/ReferencesPanel.tsx`
- **Nuevo:** `src/components/ad-frameworks/ReferenceCard.tsx`
- **Nuevo:** `src/components/ad-frameworks/ReferenceEmbed.tsx`
- **Modificar:** `src/pages/AdFrameworkDetail.tsx` (insertar `<ReferencesPanel />`)

## Notas
- Ningún embed requiere API key — todos son iframes oficiales públicos.
- Posts privados/restringidos pueden no cargar (limitación de la plataforma) → fallback "No se pudo previsualizar — abrir original".
- IG requiere cuenta pública del autor.
