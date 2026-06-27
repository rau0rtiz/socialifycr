## Mapeo actual: columna del Sheet → valor en el dashboard

Esto es lo que el sync de **JULIO 2026** está agarrando hoy (después del último cambio). El nombre de la columna es **exactamente** como aparece en la cabecera del Google Sheet (mayúsculas/acentos no importan, lo normalizo internamente).

### 1. Datos de contacto

| Columna en el Sheet | Campo en BD (`instant_form_leads`) | Dónde se ve en el dashboard |
|---|---|---|
| `NOMBRE` | `full_name` | Columna "Cliente" en el widget Leads · título del pop-up · "Cliente" en widget Ventas · `customer_contacts.full_name` (CRM histórico) |
| `TELEFONO` | `phone` (limpia el prefijo `p:`) | Línea de contacto en el pop-up · botón WhatsApp · `customer_contacts.phone` |

### 2. Respuestas del formulario (van a `custom_answers` JSON)

| Columna en el Sheet | Llave canónica en `custom_answers` | Dónde se ve |
|---|---|---|
| `MODELO DE CAMISA` | `modelo_de_camisa` | Sección "Respuestas del formulario" del pop-up · usado por widgets de Comfortex (`getModelFromLead` tipo "general") |
| `CANTIDAD DE CAMISAS` | `cantidad_de_camisas` | Pop-up · pre-llena el campo "Cantidad" al registrar venta · agrupa volumen en los buckets 6-12 / 13-29 / 30-99 / 100+ |
| `¿BORDADO?` | `bordado` | Pop-up · pre-marca el checkbox "Lleva bordado" en el flujo de venta |
| `TIPO DE POLO` (header amarillo) | `tipo_de_polo` | Pop-up · `getModelFromLead` tipo "polo" para los widgets de modelo |
| `TIPO DE CAMISA` (header azul, cuello redondo) | `tipo_de_camisa` | Pop-up · `getModelFromLead` tipo "cuello_redondo" |

### 3. Atribución de Meta

| Columna en el Sheet | Campo en BD | Dónde se ve |
|---|---|---|
| `ANUNCIO` | `ad_name` | Sección "Atribución" del pop-up · columna en CRM de vendedores |
| `CAMPAIGN` | `campaign_name` | Sección "Atribución" del pop-up · **widget Pie chart "Leads por campaña"** · agrupador del CRM |

### 4. Campos que se calculan / completan solos (no vienen del Sheet)

| Campo | De dónde sale | Para qué sirve |
|---|---|---|
| `created_time` | Timestamp del primer sync (la hoja JULIO 2026 no trae fecha) | Eje X del **widget de barras "Leads por día"** · orden cronológico en el listado · ventana de filtros (hoy / 7 días / mes) |
| `external_id` | `sheet-<spreadsheet_id>-JULIO 2026-<#fila>` | Llave única para no duplicar en re-syncs |
| `client_id` | Fijado en la configuración (Comfortex) | Aísla los leads por cliente |
| `customer_contact_id` | Se hace match/upsert contra `customer_contacts` por teléfono o nombre | Vincula el lead con el CRM histórico de clientes |
| `lead_status` | Se setea desde la app cuando se registra venta o se cambia manualmente | Badge "Ya tiene venta" · filtro de status en CRM de vendedores |

### 5. Campos de Meta que **NO** están en tu hoja JULIO 2026 (quedan vacíos)

Si más adelante agregás estas columnas al Sheet, el sync ya las reconoce sin tocar código:

- `id` / `lead_id` → `external_id` (usaría el ID real de Meta en vez del generado por fila)
- `created_time` o `fecha` → `created_time` (fecha real del lead)
- `ad_id`, `adset_id`, `adset_name`, `campaign_id`, `form_id`, `form_name`
- `platform`, `is_organic`
- `lead_status`

### 6. Filas que se ignoran

- Filas totalmente vacías.
- Cualquier fila cuyo nombre/teléfono empiece con `<test lead` (los dummies de Meta).

---

**¿Querés que ajustemos algo de este mapeo?** Por ejemplo:
- Renombrar alguna llave para que aparezca más bonita en el pop-up.
- Cambiar qué columna se usa como "modelo principal" para los widgets de Comfortex.
- Sumar alguna columna nueva del Sheet.
