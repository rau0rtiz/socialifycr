

# Habilitar Pipeline completo para Hilda Lopez

## Problema
"Hilda Lopez" no tiene el pipeline de ventas completo que usa "The Mind Coach". Actualmente solo ve la vista genérica.

## Cambio

**Archivo: `src/pages/Ventas.tsx`**

1. Agregar detección de Hilda Lopez junto a `isMindCoach`:
```typescript
const isHildaLopez = selectedClient?.name?.toLowerCase().includes('hilda');
```

2. En todos los lugares donde se usa `isMindCoach` para mostrar/ocultar widgets del pipeline, agregar `|| isHildaLopez`:
   - Línea 286: `{(isMindCoach || isHildaLopez) && <PipelineSummaryWidget ...>}`
   - Línea 315: `{(isMindCoach || isHildaLopez) && <SetterDailyCalendar ...>}`
   - Línea 320: `{!isMindCoach && !isSpkUp && !isHildaLopez && <AdSalesRanking ...>}` (ocultar ranking superior)
   - Línea 356: `{(isMindCoach || isHildaLopez) && hasAdAccount && <CampaignsDrilldown ...>}`
   - Línea 375: `{(isMindCoach || isHildaLopez) && <AdSalesRanking ...>}` (ranking al fondo)

Esto le da a Hilda Lopez exactamente los mismos widgets: PipelineSummary (KPIs), SetterDailyCalendar, CampaignsDrilldown, y AdSalesRanking al fondo.

