

## Diagnóstico: Congelamiento al cambiar pestañas rápidamente

### Causa raíz

Cada página (Dashboard, Ventas, Contenido) es un componente pesado con 8-15 hooks que disparan queries a la base de datos al montarse. Con `React.lazy` + `Suspense`, cada navegación:

1. Desmonta el componente anterior (destruye suscripciones, limpia estados)
2. Carga el chunk JS del nuevo componente
3. Monta el nuevo componente, disparando todos los hooks simultáneamente
4. React bloquea el hilo principal mientras renderiza el árbol completo

Al cambiar rápido entre pestañas, se acumulan múltiples ciclos de desmontaje/montaje/queries en cola, bloqueando el hilo principal.

### Solución

Usar **`React.startTransition`** en la navegación del Sidebar para que React no bloquee la UI durante la transición entre páginas.

### Cambios

**1. `src/components/dashboard/Sidebar.tsx`**
- Envolver la navegación con `startTransition` para que los cambios de ruta sean de baja prioridad y no bloqueen la interacción del usuario
- Usar `useTransition` para mostrar un indicador visual sutil mientras carga

**2. `src/App.tsx`**
- Agregar un fallback más ligero al `Suspense` que no cause un flash completo de loading

**3. `src/components/dashboard/DashboardLayout.tsx`**
- Agregar `key` estable al contenedor principal para evitar re-renders innecesarios del layout compartido (Sidebar + TopBar)

### Detalle técnico

```text
Antes:
  Click Sidebar → navigate() → Suspense fallback (loader) → mount pesado → freeze

Después:
  Click Sidebar → startTransition(navigate) → UI sigue respondiendo → 
  React renderiza en background → swap suave
```

La clave es que `startTransition` le dice a React que la navegación es interruptible, así si el usuario hace otro click rápido, React cancela el render anterior en vez de acumularlo.

