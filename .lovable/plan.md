

## Plan: Add stacked bar chart of daily sales by source

### What changes
Add a stacked bar chart (using Recharts, already installed) to `SalesTrackingSection.tsx` that shows sales per day, with each source type (Historia, Publicidad, Referencia, Organico, Otro) as a different colored stack.

### Technical approach

1. **Data transformation**: Group `sales` array by `sale_date`, then by `source`. Build an array like `[{ date: '01/03', story: 2500, ad: 1000, organic: 500, ... }, ...]` filling all days of the month.

2. **Chart component**: Use `BarChart` with stacked `Bar` components from Recharts, wrapped in the existing `ChartContainer` from `src/components/ui/chart.tsx`. Each source gets a distinct color:
   - story: `hsl(280, 70%, 50%)` (purple)
   - ad: `hsl(210, 80%, 50%)` (blue)
   - referral: `hsl(150, 60%, 45%)` (green)
   - organic: `hsl(40, 90%, 50%)` (amber)
   - other: `hsl(0, 0%, 60%)` (gray)

3. **Placement**: Insert the chart between the summary cards and the source breakdown badges.

4. **Also fix**: Update the card title from "Ventas por Mensajes" to "Ventas".

### Files to modify
- `src/components/dashboard/SalesTrackingSection.tsx` -- add chart imports, data transformation, and render the stacked bar chart

