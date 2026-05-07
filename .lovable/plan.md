# Persistencia permanente de historias de Alma Bendita

## Objetivo
Garantizar que **toda historia de Alma Bendita** quede guardada para siempre con su thumbnail, aunque la URL de Meta expire a las 24h, y exponer un explorador en el Business Setup del cliente.

## Problema actual
- `archived_stories` ya guarda metadata (`media_url`, `thumbnail_url`, métricas, `scanned_data`).
- Pero los `media_url`/`thumbnail_url` de Meta **expiran a las ~24h** → el thumbnail se pierde y queda solo metadata.
- Resultado: historias viejas se ven con icono placeholder, perdemos contexto visual.

## Solución

### 1. Backend — descarga y persiste el thumbnail en Storage
**Migration:**
- Crear bucket público `story-thumbnails` (con RLS: lectura pública, escritura solo service role).
- Agregar columna `archived_stories.persistent_thumbnail_url TEXT` (URL permanente del bucket).

**Edge function `capture-stories` (modificar):**
- Tras el upsert, si la historia aún no tiene `persistent_thumbnail_url`:
  1. Descargar `thumbnail_url` (o `media_url` si es imagen) de Meta.
  2. Subir a `story-thumbnails/{client_id}/{story_id}.jpg`.
  3. Guardar la URL pública en `persistent_thumbnail_url`.
- Idempotente: nunca re-descarga si ya existe.

**Backfill on-demand:**
- Edge function nueva `backfill-story-thumbnails` que recorre historias de Alma Bendita sin `persistent_thumbnail_url` y aún con URL Meta válida (las que ya expiraron simplemente quedarán sin thumbnail histórico — no hay forma de recuperarlas).

### 2. Frontend — usar thumbnail persistente
- `useStories` y todos los componentes que muestran thumbnails (`OrderWizardDialog`, story tracker, story sales UI, etc.) deben preferir `persistent_thumbnail_url` sobre `thumbnail_url`/`media_url`.
- Fallback: si no existe, usa el de Meta (puede estar caído) y luego el placeholder temático.

### 3. UI — Pestaña "Base de Historias" en Business Setup de Alma Bendita
- Nueva pestaña visible solo para Alma Bendita (`config/setup`).
- Grid 9:16 paginado (50 por página) con:
  - Thumbnail persistente
  - Fecha (es-CR)
  - Métricas (impresiones / alcance / replies)
  - `scanned_data` resumido (cliente, marca, monto)
  - Link al permalink de IG
- Filtros: rango de fechas, búsqueda por texto (nombre cliente / marca / notas).
- Botón "Reescanear con IA" por historia (re-ejecuta OCR si quedó vacío).
- Botón global "Sincronizar ahora" que invoca `capture-stories`.

## Detalles técnicos

```text
DB:
  archived_stories
    + persistent_thumbnail_url TEXT NULL
  bucket: story-thumbnails (public read)

Flujo de captura:
  Meta API → upsert archived_stories
           → if !persistent_thumbnail_url:
               fetch(thumbnail_url) → upload bucket → update row

Frontend resolución de imagen:
  persistent_thumbnail_url
    ?? thumbnail_url
    ?? media_url (si es IMAGE)
    ?? placeholder
```

## Archivos a tocar
- `supabase/migrations/<new>.sql` — bucket + columna + policies
- `supabase/functions/capture-stories/index.ts` — descarga + upload thumbnail
- `supabase/functions/backfill-story-thumbnails/index.ts` — nueva
- `supabase/config.toml` — registrar nueva función con `verify_jwt = false`
- `src/hooks/use-stories.ts` — exponer `persistent_thumbnail_url`
- `src/components/ventas/orders/OrderWizardDialog.tsx` y demás consumidores — usar URL persistente
- `src/pages/config/...` — nueva pestaña "Historias" para Alma Bendita
- `src/components/config/StoriesArchiveBrowser.tsx` — nuevo componente

## Fuera de alcance
- No se guarda el video completo (solo el thumbnail).
- No se reconstruyen historias cuyas URLs Meta ya hayan expirado antes de este cambio (esas seguirán sin foto).
