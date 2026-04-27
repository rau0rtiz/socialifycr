## Cambio puntual de copy en el Roadmap

En `src/components/funnel/WelcomeStep.tsx`, reemplazar el subtítulo actual:

**Antes:**
> En menos de 2 minutos

**Después:**
> Recibí un plan específico para tu negocio en menos de 2 minutos

### Detalles
- Solo se modifica el `<p>` que está justo debajo del título principal (línea ~16).
- Se mantienen los mismos estilos (`text-lg md:text-xl text-[#212121]/60 font-medium tracking-wide -mt-4`).
- No se toca nada más: el título principal, el botón "EMPEZAR AHORA", los bullets con sparkles ni el disclaimer legal quedan igual.

### Archivo afectado
- `src/components/funnel/WelcomeStep.tsx` (1 línea)
