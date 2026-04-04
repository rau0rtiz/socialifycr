

# Plan: Remover dropdown de "meta por defecto" de campañas

## Resumen
Eliminar el `Select` de "Sin meta por defecto" del header del widget de campañas activas, ya que ahora cada campaña tiene su propia meta asignada individualmente.

## Cambio

### `src/components/dashboard/CampaignsDrilldown.tsx`
- Eliminar el bloque del `Select` de meta por defecto (líneas ~635-656) que contiene el dropdown con "Sin meta por defecto" y las opciones de `GOAL_OPTIONS`
- También se pueden limpiar imports y variables relacionadas si quedan sin uso (`defaultGoal`, `setDefaultGoalMutation`, `Target` icon si no se usa en otro lado, etc.)

Un solo archivo, un solo cambio.

