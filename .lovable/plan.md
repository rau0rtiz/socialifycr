

## Cambio de texto en el Funnel (WelcomeStep)

### Cambios solicitados

Actualizar el encabezado del funnel (`src/components/funnel/WelcomeStep.tsx`) con el nuevo texto:

**Antes:**
```
OBTENÉ TU
ROADMAP DE CRECIMIENTO PARA TU NEGOCIO
EN MENOS DE 2 MINUTOS
```

**Después:**
```
OBTENÉ TU
ROADMAP DE CRECIMIENTO DIGITAL
PARA TU NEGOCIO
En menos de 2 minutos (texto más pequeño)
```

### Implementación

**Archivo:** `src/components/funnel/WelcomeStep.tsx`

Reemplazar líneas 10-14 para:
1. Separar "ROADMAP DE CRECIMIENTO DIGITAL" (naranja) de "PARA TU NEGOCIO"
2. Agregar `<p>` debajo del `<h1>` con "En menos de 2 minutos" en texto más pequeño (`text-lg md:text-xl` con opacidad reducida)

