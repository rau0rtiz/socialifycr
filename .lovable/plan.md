## Cambio en el sync de Instant Form (Comfortex – Google Sheets)

### Qué se va a tocar
Solo el backend (`supabase/functions/sync-instant-form-leads/index.ts`) y la configuración del cliente Comfortex en `instant_form_lead_sources`. **No se toca nada del dashboard ni de los widgets.**

### 1. Apuntar a la hoja `JULIO 2026`
- Update en `instant_form_lead_sources` para `client_id = d90a18b8-dad0-4f52-9447-c13f8f19f0d7` → `sheet_name = 'JULIO 2026'`.
- También se puede cambiar desde Configuración del Negocio sin tocar código cuando llegue agosto.

### 2. Ajustar el mapeo de columnas en el edge function
Ampliar el `FIELD_MAP` y la lógica de `custom_answers` para que reconozca los headers cortos en español que usa la hoja JULIO 2026, mapeándolos a los campos canónicos que ya consumen los widgets:

| Header en Sheet | Se guarda como |
|---|---|
| NOMBRE | `full_name` |
| TELEFONO | `phone` (limpia prefijo `p:`) |
| MODELO DE CAMISA | `custom_answers.modelo_de_camisa` |
| CANTIDAD DE CAMISAS | `custom_answers.cantidad_de_camisas` |
| ¿BORDADO? | `custom_answers.bordado` |
| TIPO DE POLO | `custom_answers.tipo_de_polo` |
| TIPO DE CAMISA | `custom_answers.tipo_de_camisa` (cuello redondo) |
| ANUNCIO | `ad_name` |
| CAMPAIGN | `campaign_name` |

Claves canónicas confirmadas mirando `src/lib/comfortex-leads.ts` (los widgets ya leen `modelo_de_camisa`, `tipo_de_polo`, `tipo_de_camisa`) → no hay que tocar nada del frontend.

### 3. `created_time`
La hoja no trae fecha. Se usará el timestamp del primer sync (la fila se inserta con `created_time = now()` cuando aparezca por primera vez y nunca se sobreescribe en upserts posteriores). Esto implica un pequeño ajuste: en el upsert, `created_time` solo se setea si viene en la hoja **o** si el registro es nuevo; no se pisa con `null` en filas existentes.

### 4. Filtrar los leads de prueba de Meta
Las filas que empiezan con `<test lead:` en `nombre_completo` se omiten (ya los borraste manualmente, esto evita que vuelvan a entrar en próximos syncs).

### 5. Re-deploy + sync manual
Tras desplegar la función, corro un sync para Comfortex y confirmo en `instant_form_leads` que:
- `full_name`, `phone`, `ad_name`, `campaign_name` quedan poblados.
- `custom_answers` trae las 5 llaves esperadas.
- Los widgets (Leads, Sales, Pie por campaña, Barras por día) siguen viéndose igual.

### Lo que NO cambia
- UI del dashboard, widgets, popup de venta, layout, colores, hooks de React, tabla `instant_form_leads` (mismo schema).
