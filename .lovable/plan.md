

## Plan: Ofrecer llamada a nivel 3 con ingresos $5K–$15K

### Cambios

**1. `src/pages/Funnel.tsx`**
- Pasar `revenueRange={answers.ingresos}` como prop adicional a `ResultsStep`

**2. `src/components/funnel/ResultsStep.tsx`**
- Agregar prop `revenueRange` al componente
- Cambiar la lógica de `qualifiesForSession`: ahora es `level >= 4` **O** (`level === 3` **Y** `revenueRange === '5k15k'`)
- Esto hace que solo los nivel 3 que facturan entre $5K y $15K vean el CTA de agendar sesión

**3. Hacer el campo de ingresos más visible en el funnel (paso 2)**
- En `src/pages/Funnel.tsx`, agregar un subtítulo destacado debajo de la pregunta de facturación (paso 2) — por ejemplo un badge o texto resaltado tipo "Este dato define tu nivel de negocio"
- Opcionalmente dar más peso visual a las opciones de ingreso con un icono de `DollarSign`

### Detalle técnico
- La prop `revenueRange` se usa solo para el condicional, sin cambiar la lógica de cálculo de nivel existente
- No requiere cambios de base de datos

