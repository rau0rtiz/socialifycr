## Objetivo

Agregar al Dashboard de Comfortex tres widgets enfocados en analizar los leads del Instant Form, usando los campos que ya están llegando del Google Sheet.

## Campos detectados en `custom_answers`

- `modelo_de_camisa` — qué modelo busca
- `cantidad_de_camisas` — volumen cotizado
- `bordado` — sí/no
- `tipo_de_polo` — modelo polo preferido
- `tipo_de_camisa` — modelo cuello redondo preferido
- Plus campos top-level: `campaign_name`, `adset_name`, `ad_name`, `platform`

El sistema usará estos nombres normalizados. Si en el futuro entran headers nuevos, se mostrarán automáticamente como "otros".

## Widgets nuevos en el Dashboard de Comfortex

Se agregan **abajo** del widget actual `InstantFormLeadsWidget`, respetando el rango de fechas que ya existe en ese widget (compartido vía estado en `Dashboard.tsx`).

### 1. UTM / Atribución de campañas

Card con tabs:
- **Por campaña** — tabla: campaña · leads · % del total · barra
- **Por adset** — mismo formato
- **Por anuncio** — mismo formato
- **Por plataforma** — Facebook / Instagram / Organic con % share

Cada fila clickeable filtra los otros widgets (estado local) para ver el desglose de modelos por esa campaña.

### 2. Modelos de camisa más cotizados

Card con:
- Bar chart horizontal: top modelos solicitados, combinando `modelo_de_camisa` + `tipo_de_polo` + `tipo_de_camisa` (normalizado a minúsculas, agrupando equivalentes triviales).
- Toggle para ver por tipo separado: General / Polo / Cuello redondo.
- Badge con % que pide bordado.

### 3. Volumen de camisas cotizadas

Card con KPIs y mini-chart:
- **Total camisas cotizadas** (suma de `cantidad_de_camisas` parseado a número, ignora valores no numéricos).
- **Promedio por lead**.
- **Distribución por rangos**: 1–10, 11–50, 51–100, 101–500, 500+.
- **Top 5 leads por volumen** (nombre · teléfono · cantidad · modelo).

## Detalles técnicos

- Todo es **frontend**: 3 componentes nuevos en `src/components/dashboard/` (`ComfortexUtmBreakdown.tsx`, `ComfortexModelDemand.tsx`, `ComfortexVolumeWidget.tsx`).
- Consumen el mismo hook `useInstantFormLeads(clientId)` ya existente — no se crean queries nuevas.
- Helper compartido `src/lib/comfortex-leads.ts` para: parsear cantidad, normalizar modelos, calcular rangos.
- Se renderizan en `Dashboard.tsx` solo cuando `client.id === COMFORTEX_ID` (mismo gating que el widget actual). Sin nuevos feature flags.
- Filtro de rango (7/30/90/todo) y filtro por campaña se elevan a estado en `Dashboard.tsx` para que los 4 widgets queden sincronizados.
- Sin cambios de DB, sin cambios de edge function, sin cambios de Business Setup.

## Fuera de alcance

- Editar el sync de Google Sheets.
- Cambiar el mapeo de `FIELD_MAP`.
- Persistir filtros entre sesiones.
- Roles/permisos nuevos.
