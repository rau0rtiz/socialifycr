

## Plan: Actualizar Secciones y Widgets en Gestión de Clientes

### Problema

1. **Defaults en `false`**: Cuando un cliente no tiene registro en `client_feature_flags`, casi todos los flags se inicializan en `false`. Esto causa que las secciones y widgets no aparezcan hasta activarlos manualmente uno por uno.
2. **Secciones faltantes**: La UI de feature flags no incluye Business Setup ni Asistencia.

### Solución

**Cambiar defaults a `true`** para que todos los clientes tengan todas las secciones y widgets habilitados por defecto, y solo se desactiven manualmente los que no aplican.

**Agregar secciones faltantes** (Business Setup, Asistencia) al panel de feature flags.

### Archivos modificados

1. **`src/hooks/use-client-features.ts`**
   - Cambiar `DEFAULT_FLAGS` para que todos los flags booleanos sean `true` por defecto (en vez de solo `dashboard` y `setter_checklist`)
   - Agregar flags: `business_setup_section`, `asistencia_section`
   - Agregar labels para las nuevas secciones

2. **`src/components/clientes/ClientFeatureFlags.tsx`**
   - Agregar cards para Business Setup y Asistencia en el array `SECTIONS`

3. **`src/components/dashboard/Sidebar.tsx`**
   - Respetar los nuevos flags `business_setup_section` y `asistencia_section` en la lógica de visibilidad del menú

4. **Migración de base de datos**
   - Agregar columnas `business_setup_section` y `asistencia_section` (boolean, default `true`) a la tabla `client_feature_flags`

### Resultado

Todos los clientes verán todas las secciones y widgets por defecto. El administrador puede desactivar selectivamente lo que no aplica para cada cliente.

