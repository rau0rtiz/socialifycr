## Mantener clientes visibles en Prospección

Actualmente cuando un lead pasa a estado `cliente` desaparece de la vista de prospección. Quiero que sigan apareciendo siempre, pero con un badge visual de "Ya es cliente".

### Cambios

**1. Vista de Prospección (`ClientsView.tsx` o equivalente en `agency-crm`)**
- No filtrar fuera los leads con `status = 'cliente'`. Seguir mostrándolos en la lista/kanban junto con el resto.
- Si la vista es kanban por status, mantener la columna "Cliente" pero también mostrar una marca visual ("✓ Cliente") en su tarjeta para que se distinga rápidamente.
- En vistas tipo tabla/lista de prospectos, añadir un badge verde "Cliente" al lado del nombre cuando `status === 'cliente'`.

**2. Sin cambios de datos ni de hooks**
- No tocar `use-agency-crm-leads.ts` ni el schema. El estado `cliente` ya existe; solo se ajusta la presentación.
- Sin migraciones.

### Pregunta abierta
¿La vista actual de prospección es kanban (columnas por status) o tabla única? Necesito confirmar para aplicar el badge en el lugar correcto — pero asumo ambos casos en la implementación.

### Resultado
Noelia, Gaby Rojas y cualquier futuro lead que cierre venta seguirán visibles en la sección de Prospección con un distintivo claro de que ya son clientes activos.