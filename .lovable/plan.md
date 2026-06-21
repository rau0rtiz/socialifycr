# Generador de shots con Claude Opus

Agregar en cada hoja de producción (`/agencia/producciones/:sheetId`) un botón **"Generar shots con IA"** que abre un modal con un prompt denso obligatorio, llama a Claude Opus vía edge function, y rellena la sección **Shots** de la hoja.

## Alcance

- Solo pobla la sección **Shots** (`production_sheet_shots`). Equipo, vestuario, título y metadata no se tocan.
- Claude Opus como motor único de esta función (no toggle con Gemini, según indicaste API key propia).
- Lovable AI / Gemini sigue intacto para el resto del proyecto.

## Flujo de usuario

1. En la hoja, botón **"Generar shots con IA"** junto a los controles existentes de Shots.
2. Modal con:
   - Textarea **obligatoria** del prompt (mín. ~120 caracteres, contador visible).
   - Helper text con guía: tipo de pieza, audiencia, tono, locación, referencias, restricciones, duración objetivo.
   - Selector de modelo (default `claude-opus-4`, opción `claude-sonnet-4` para ahorrar).
   - Input numérico "Cantidad de shots" (default 8, rango 3–20).
   - Checkbox "Reemplazar shots existentes" (off por defecto → agrega al final).
   - Botón **Generar** (deshabilitado hasta cumplir longitud mínima).
3. Loading state con mensaje "Claude está pensando…".
4. Preview de los shots generados antes de guardar: lista editable con check para descartar individualmente.
5. Botón **Guardar en hoja** → inserta en `production_sheet_shots` con `sort_order` correlativo.

## Backend

**Secret nuevo:** `ANTHROPIC_API_KEY` (la pedimos vía `add_secret` tras aprobar el plan).

**Edge function nueva:** `supabase/functions/generate-production-shots/index.ts`
- `verify_jwt` por default, valida `getClaims()`.
- Valida acceso del usuario al `client_id` de la hoja vía `has_client_access`.
- Input (Zod): `sheet_id`, `prompt` (min 80 chars), `model` (`claude-opus-4-20250514` | `claude-sonnet-4-20250514`), `shot_count` (3–20).
- Trae contexto de la hoja: título, fecha, locación, cliente (nombre + marca/colores), shots existentes (para que Claude no duplique si "agregar").
- Llama a `https://api.anthropic.com/v1/messages` con:
  - System prompt experto en dirección de fotografía/video publicitario, instrucciones de formato JSON estricto.
  - Output estructurado JSON: `[{ shot_type, description, duration_seconds, notes }]`.
- Parsea, valida con Zod, devuelve array al frontend (no escribe en DB — el frontend confirma y guarda).
- Manejo de errores: 401 (API key inválida), 429 (rate limit Anthropic), 529 (overloaded) → mensajes claros al UI.

## Frontend

- Nuevo componente `src/components/producciones/GenerateShotsDialog.tsx`.
- Integrado en `src/pages/ProduccionSheet.tsx` cerca del header de la sección Shots.
- `supabase.functions.invoke('generate-production-shots', { body })`.
- Tras confirmar, inserts batch en `production_sheet_shots` con el cliente Supabase existente.
- Toasts para éxito/error usando el sistema actual.

## Detalles técnicos

- **Modelo default**: `claude-opus-4-20250514` (Opus 4). Sonnet 4 como alternativa más barata.
- **Max tokens**: 4000 (suficiente para 20 shots detallados).
- **Temperature**: 0.8 para creatividad.
- **No streaming** en esta v1 — devuelve JSON completo, más simple y el usuario ve loader corto.
- **Costo**: cada generación con Opus ronda $0.05–$0.15 según largo de prompt + output. Se cobra a la API key del usuario directamente con Anthropic, no a créditos Lovable.
- **Rate limiting app-level**: máx. 1 generación simultánea por usuario (estado local del botón).

## Archivos

Nuevos:
- `supabase/functions/generate-production-shots/index.ts`
- `src/components/producciones/GenerateShotsDialog.tsx`

Editados:
- `src/pages/ProduccionSheet.tsx` (botón + integración del modal en la sección Shots)

## Pasos de implementación

1. Pedir secret `ANTHROPIC_API_KEY`.
2. Crear edge function con validación y llamada a Anthropic.
3. Crear `GenerateShotsDialog` con prompt denso + preview.
4. Integrar botón en `ProduccionSheet.tsx`.
5. Probar flujo end-to-end en la hoja actual.

## Fuera de alcance

- Generar título/locación/equipo/vestuario.
- Generar hoja completa desde cero (botón solo dentro de una hoja existente).
- Edición de imágenes de referencia / moodboard.
- Toggle Claude vs Gemini.
