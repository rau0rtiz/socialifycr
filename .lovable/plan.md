
## 1. Compactar `ComfortexUtmBreakdown`

Archivo: `src/components/dashboard/ComfortexUtmBreakdown.tsx`

- Reducir padding del Card (`CardHeader` y `CardContent` con `py-3` / `pt-2`).
- Tipografía más chica: título `text-base`, filas `text-xs`, barras `h-1.5` en vez de `h-2`.
- Mostrar **Top 5** por defecto con botón "Ver todos" para expandir.
- Espaciado entre filas `space-y-1.5` y `mt-0.5` para la barra.
- Tabs más compactos (`h-8`, `text-xs`).

No se cambia la lógica de cálculo ni el filtro de fechas.

## 2. Nuevo widget: `ComfortexActiveHours`

Archivo nuevo: `src/components/dashboard/ComfortexActiveHours.tsx`

Heatmap inspirado en el screenshot de Google Ads (Day & Hour), adaptado a leads:

- Reusa `useInstantFormLeads(clientId)` y `filterByRange` de `comfortex-leads.ts`.
- Hora local Costa Rica (UTC-6) calculada vía offset manual sobre `created_time || created_at` (consistente con el resto del dashboard).
- Tres pestañas:
  - **Día**: barras horizontales por día de la semana (L–D).
  - **Día y hora** (default): grid 7×24 (filas = días L→D, columnas = 24 horas). Intensidad del color = cantidad de leads en ese bucket (escala lineal sobre el máximo del rango). Tooltip nativo `title` con `"Lun 14:00 · 3 leads"`.
  - **Hora**: barras por hora (0–23).
- Mismo `Select` de rango que el widget de atribución (Hoy / 7d / 30d / Este mes / 90d / Todo), default `month`.
- Header con icono `Clock`, título "Horarios más activos", badge con total de leads del rango.
- Eje X con etiquetas `12 AM / 6 AM / 12 PM / 6 PM / 12 AM`; eje Y con iniciales de día.
- Color: `bg-primary` con `opacity` derivado (`Math.max(0.08, count/max)`) sobre celdas `bg-muted` vacías, para mantener el sistema de diseño (sin hex hardcodeado).
- Footer pequeño con leyenda: cuadrito vacío → "menos" … cuadrito lleno → "más".
- Estado vacío: mensaje centrado "Sin datos en este rango." cuando el rango filtrado no tiene leads.

Sin estado server, sin nuevas tablas, sin edge functions.

## 3. Integración en Dashboard

Archivo: `src/pages/Dashboard.tsx`

- Lazy import del nuevo componente junto a los demás Comfortex widgets.
- Renderizarlo **debajo** del grid que contiene `ComfortexUtmBreakdown`, ancho completo (`grid-cols-1`), envuelto en `Suspense` con skeleton `h-80`.
- Aplicar el mismo cambio en los **dos bloques** Comfortex (líneas ~372–382 y ~419–429).

## Detalles técnicos

```text
heatmap cell intensity = leads_in_bucket / max_bucket_in_range
display:
  cell = `rounded-sm` `aspect-square` `bg-muted` con overlay `bg-primary` opacity = intensity
grid: `grid-cols-[auto_repeat(24,minmax(0,1fr))]` para incluir etiqueta de día a la izquierda.
```

Tipos: reutiliza `InstantFormLead`. No requiere cambios en hooks ni en types de Supabase.

## Archivos tocados

- `src/components/dashboard/ComfortexUtmBreakdown.tsx` (compactar)
- `src/components/dashboard/ComfortexActiveHours.tsx` (nuevo)
- `src/pages/Dashboard.tsx` (lazy import + render en 2 lugares)
