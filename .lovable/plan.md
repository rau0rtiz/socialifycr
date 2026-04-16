

## Plan: Agregar campo de Instagram/nombre de negocio al funnel

### Problema
La pregunta de industria da categorías genéricas ("Servicios profesionales", "E-commerce") pero no te dice *qué* hace el negocio ni cómo encontrarlo. Necesitás más contexto para prepararte antes de una llamada.

### Solución
Agregar un campo opcional de **@ de Instagram o nombre del negocio** en el paso de resultados (junto con nombre y email), en vez de agregar otra pregunta al quiz. Esto:
- No agrega fricción al quiz (sigue siendo 6 preguntas rápidas)
- Captura info accionable justo cuando el lead ya decidió dar sus datos
- Te permite buscar el negocio antes de la llamada

### Cambios

**1. `src/components/funnel/ResultsStep.tsx`**
- Agregar un tercer campo en el formulario de contacto: "Instagram o nombre de tu negocio" (opcional, con placeholder `@tucuenta o Nombre del negocio`)
- Pasar el valor como parámetro adicional en `onSubmitContact`
- Icono de Instagram/edificio al lado del campo

**2. `src/pages/Funnel.tsx`**
- Actualizar `handleSubmitContact` para recibir el nuevo campo (`businessHandle`)
- Guardarlo en el objeto `answers` del insert a `funnel_leads` (dentro del JSON `answers`, no requiere nueva columna)

**3. Base de datos**
- No se necesita migración — el campo se guarda dentro de la columna JSONB `answers` existente

**4. Vistas de leads**
- `src/pages/AgencyLeads.tsx` y `src/components/comunicaciones/AgencyLeadsContent.tsx`: mostrar el handle/nombre de negocio en la tabla y el detalle del lead (leyéndolo de `answers.businessHandle`)

### Detalle técnico
- El campo es opcional para no bajar la tasa de conversión
- Se almacena en `answers.businessHandle` del registro `funnel_leads`
- La firma de `onSubmitContact` cambia de `(name, email)` a `(name, email, businessHandle?)`

