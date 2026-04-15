

## Actualizar Funnel con nueva lógica del JSON

### Resumen
Reemplazar las preguntas, opciones y sistema de scoring del funnel actual con la estructura definida en el JSON. Pasa de 7 preguntas actuales a 6 preguntas + formulario de captura, con scoring basado en puntos (max 20) de 3 preguntas (ingresos, presencia, pauta).

### Cambios en preguntas

| Step | Actual | Nuevo (JSON) |
|------|--------|-------------|
| 1 | Industria (7 opciones) | Industria (6 opciones, textos distintos) |
| 2 | Tiempo de negocio | Ingresos mensuales (5 opciones con puntos) |
| 3 | Tamaño de equipo | Presencia en redes (5 opciones con puntos) |
| 4 | Ingresos mensuales | Inversión en pauta (7 opciones con puntos) |
| 5 | Canal de adquisición | Canal de ventas (7 opciones) |
| 6 | Mayor desafío | Objetivo de marketing (5 opciones) |
| 7 | Email capture | Email capture (mismo) |
| 8 | Resultados | Resultados (mismo diseño, nuevo scoring) |

### Nuevo scoring
- Solo q2 (ingresos), q3 (presencia) y q4 (pauta) suman puntos
- Puntaje máximo: 20
- Niveles: 0-3→L1, 4-6→L2, 7-10→L3, 11-14→L4, 15-17→L5, 18-20→L6

### Archivos a modificar

1. **`src/pages/Funnel.tsx`**
   - Reemplazar arrays de opciones (industries, timeOptions, etc.) con los del JSON
   - Actualizar `TOTAL_QUESTION_STEPS` a 6
   - Reemplazar `calculateLevel()` con lógica de puntos del JSON
   - Actualizar `answers` state y `handleSubmit` para mapear los nuevos campos
   - Ajustar `renderStep()` con las 6 nuevas preguntas

2. **`src/components/funnel/EmailCaptureStep.tsx`**
   - Actualizar título: "¿A dónde te enviamos tu Roadmap de Crecimiento Digital?"

3. **DB insert** — actualizar campos enviados a `funnel_leads` (guardar `presencia`, `pauta`, `canal_ventas`, `objetivo` en el campo `answers` JSONB)

### Sin cambios
- `WelcomeStep.tsx` — ya actualizado
- `ResultsStep.tsx` — los 6 niveles se mantienen igual
- `FunnelQuestion.tsx` — componente genérico, no necesita cambios
- No se necesitan migraciones de DB (el campo `answers` es JSONB flexible)

