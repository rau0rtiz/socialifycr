
## Qué se va a construir

Un botón **"Generar mensaje WhatsApp"** dentro del popup de cada lead en el CRM de Vendedores (`SellerLeadDetailDialog`, pestaña *Info del lead*). Al presionarlo:

1. Envía los datos del lead (nombre, respuestas del formulario, campaña/anuncio) a una edge function nueva.
2. La edge function llama a la API de Anthropic (Claude) usando el prompt de Comfortex que diste como `system prompt`, y el contenido del lead como mensaje del usuario.
3. La respuesta aparece en un cuadro de texto dentro del mismo popup con un botón **Copiar** y otro **Abrir en WhatsApp** (que abre `wa.me/<teléfono>` con el mensaje pre-rellenado).

El mensaje sigue exactamente el formato que diste: identifica producto, cantidad, bordado/no bordado, y arma el texto listo para pegar. Los precios y reglas viven en el `system prompt` para que Claude nunca invente valores.

## Detalles técnicos

**Edge function nueva:** `supabase/functions/generate-comfortex-reply/index.ts`
- `verify_jwt = false` (estándar Lovable). Validamos sesión del usuario manualmente leyendo el JWT.
- Recibe `{ leadId }`. Carga el lead desde `instant_form_leads` con service_role y verifica que el usuario tenga acceso al `client_id`.
- Llama a `https://api.anthropic.com/v1/messages` con:
  - `model`: `claude-sonnet-4-5` (rápido y bueno para extracción + formato).
  - `system`: el prompt completo que diste (precios, reglas, formato).
  - `messages`: un único mensaje `user` que serializa nombre + `custom_answers` del lead.
- Usa el secreto `ANTHROPIC_API_KEY` (ya existe en el proyecto).
- Devuelve `{ message: string }`.

**UI — cambios en `src/components/seller-crm/SellerLeadDetailDialog.tsx`:**
- En la pestaña *Info del lead*, debajo de "Respuestas del formulario", agregar:
  - Botón `Generar mensaje WhatsApp` (con ícono Sparkles, loading state).
  - Cuando hay respuesta: un `<Textarea readonly>` con el mensaje, botón **Copiar** (usa `navigator.clipboard`) y botón **Abrir WhatsApp** que abre `https://wa.me/<phone>?text=<encoded>`.
  - Toast de éxito/error.
- El botón solo aparece para clientes Comfortex (filtrado por `client_id === 'd90a18b8-...'` o por nombre del cliente que contenga "comfortex", para que no aparezca en otros clientes del CRM).

**Manejo de errores:**
- Si Anthropic devuelve 429/401/5xx, mostrar toast con el mensaje.
- Si el lead no tiene respuestas útiles, igual se envía a Claude (puede usar el nombre/campaña).

## Lo que NO cambia

- No se toca el flujo de venta, estados, ni sincronización de leads.
- No se persiste el mensaje generado en la base de datos (es solo para copiar y pegar). Si más adelante lo quieres guardar como nota o log, se agrega después.
- No se modifica el prompt en código del frontend — vive en la edge function para evitar exponer reglas/precios al navegador.
