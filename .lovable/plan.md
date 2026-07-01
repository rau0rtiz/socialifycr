## Widget: Tiempo Promedio de Cierre

Nuevo widget en el dashboard de Comfortex que mide cuánto tiempo pasa desde que un lead llena el Instant Form hasta que se registra la venta.

### Fuente de datos
- `instant_form_leads.created_time` → llegada del lead
- `message_sales.created_at` (o `sale_date`) del registro vinculado vía `instant_form_leads.message_sale_id`
- Solo cuentan leads con `message_sale_id IS NOT NULL` y venta no `cancelled`

### Métrica principal
- **Promedio** de duración lead→venta, mostrado en la unidad más legible (horas si <48h, días en caso contrario)
- Sub-métricas: mediana, más rápido, más lento, y # de ventas atribuidas usadas en el cálculo

### UI
- Card estilo KPI, misma línea visual que los otros widgets Comfortex
- Ícono de reloj, título sugerido: **"Tiempo de cierre"** (subtítulo: "desde formulario hasta venta")
- Selector de rango con las mismas opciones que los demás widgets (`Todo` por default, `Hoy`, `Este mes`, `Mes pasado`, `7/30/90` días). El rango filtra por `sale_date` de la venta.
- Mini distribución: barras cortas con buckets `<24h`, `1–3d`, `4–7d`, `8–14d`, `15d+`
- Estado vacío claro cuando aún no hay ventas vinculadas en el rango

### Ubicación
- Se agrega a la grilla de widgets Comfortex del Dashboard (junto a `ComfortexVolumeWidget` / `InstantFormSalesWidget`), respetando la lógica de feature flags existente.

### Archivos técnicos
- Nuevo: `src/components/dashboard/ComfortexCloseTimeWidget.tsx`
- Editar: `src/pages/Dashboard.tsx` (o el contenedor donde se listan los widgets Comfortex) para insertarlo
- Reutiliza `getRange` / `isInRange` de `src/lib/comfortex-leads.ts` y el hook `useInstantFormLeads` + `useMessageSales` ya existentes

### Pregunta abierta
¿El "cierre" se mide contra `sale_date` (fecha comercial, día) o `created_at` de la venta (timestamp exacto)? Por defecto usaré `created_at` para tener precisión en horas — dime si prefieres `sale_date`.
