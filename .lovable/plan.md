# Miniatura preliminar para piezas del calendario

## Problema
Hoy, cuando una pieza viene de una hoja de producción, hereda la foto de portada de **toda la hoja** como su miniatura. Por eso varios reels del mismo mes salen con la misma imagen "random" y el cliente cree que es otro video. Solo se guían por el título.

## Qué cambia

1. **Dos miniaturas por pieza (lado agencia)**
   - **Miniatura preliminar**: Ale la sube al planificar (captura, foto de referencia, frame de Milanote). Sirve solo para identificar el video.
   - **Portada final**: la que ya existe, la que el cliente aprueba o pide cambios.
   - En el popup de la pieza: dos botones separados, "Subir preliminar" y "Subir portada final", cada uno con quitar/cambiar.

2. **Qué ve el cliente**
   - Si hay portada final: se muestra como hoy.
   - Si solo hay preliminar: se muestra con una etiqueta visible "Referencia · video en proceso" sobre la imagen, en el calendario mensual, en Piezas y en el popup.
   - Si no hay ninguna: un recuadro oscuro con el tipo (REEL, FOTO…) y el título grande, en vez de una foto que confunda.
   - La preliminar **no** se aprueba ni pide cambios; la revisión de portada solo aparece con la portada final.
   - En el popup, junto a la preliminar, un botón "Ver en Milanote" cuando la pieza tiene ese link.

3. **Quitar la foto heredada de la hoja**
   - Las piezas nuevas que vengan de hojas de producción ya no copian la portada de la hoja.
   - Las piezas existentes cuya miniatura es exactamente la portada de su hoja se limpian (quedan sin miniatura, listas para que Ale suba la preliminar). Las miniaturas subidas a mano se conservan.

## Detalles técnicos
- Migración: columna `preliminary_thumbnail_url text` en `content_calendar_items`; limpieza de `thumbnail_url` donde coincide con `production_sheets.thumbnail_url` de su hoja (vía `shot_id`).
- `clickup-create-tasks` (insert línea ~479): dejar de setear `thumbnail_url` desde la hoja.
- `calendar-public`: incluir `preliminary_thumbnail_url` en el select público; `hasCover` sigue dependiendo solo de `thumbnail_url`.
- `CalendarThumb` / `itemThumb` en `CalendarMonth`: prioridad final → preliminar (con badge) → placeholder tipográfico.
- `agencia/Calendario.tsx`: segundo uploader al mismo bucket `content-images/calendar/`.
- Test: preferencia de miniatura (final > preliminar > ninguna) y que preliminar no habilita revisión de portada.
