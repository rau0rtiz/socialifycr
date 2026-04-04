

## Plan: Selector de hora estilo scroll rotacional (Apple-style)

### Resumen
Reemplazar el input de hora + botones preestablecidos por un selector tipo "drum/wheel picker" estilo iOS, con dos columnas independientes de scroll: una para horas (00–23) y otra para minutos (00–55 en intervalos de 5).

### Cambios

**1. Crear componente `ScrollTimePicker`** (`src/components/ui/scroll-time-picker.tsx`)
- Dos columnas de scroll vertical (hora y minutos) con efecto de "snap" al centro
- Cada columna muestra los valores en un contenedor con overflow-y scroll y CSS `scroll-snap-type: y mandatory`
- El item central (seleccionado) se resalta con mayor tamaño/opacidad, los adyacentes se atenúan gradualmente (efecto 3D/perspectiva con CSS)
- Línea indicadora horizontal al centro para marcar la selección
- Props: `value: string` (HH:mm), `onChange: (value: string) => void`
- Horas: 00–23, Minutos: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
- Auto-scroll al valor inicial al montar

**2. Actualizar `AppointmentFormDialog.tsx`** (líneas 433–461)
- Reemplazar el `<Input type="time">` y la cuadrícula de botones de hora por el nuevo `<ScrollTimePicker>`
- Mantener el state `salesCallTime` y su integración con el resto del formulario sin cambios

### Detalles técnicos del wheel picker
- Usar `useRef` + `scrollTo` con `behavior: 'smooth'` para posicionar al valor actual
- CSS: `scroll-snap-align: center` en cada item, contenedor con altura fija (~120px) y padding vertical para permitir que el primer/último item llegue al centro
- Efecto visual: items fuera del centro con `opacity` y `scale` reducidos via CSS o cálculo dinámico en `onScroll`
- `IntersectionObserver` o `onScroll` + cálculo de posición para detectar el item seleccionado

