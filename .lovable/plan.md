

## Carga progresiva de historias archivadas

### Idea
Limitar la carga inicial de historias archivadas a las 100 mas recientes y agregar un boton "Ver todas" que abre un dialog con la lista completa (cargada bajo demanda).

### Cambios

**File: `src/hooks/use-stories.ts`**
1. Cambiar la query de `archived-stories` para que solo traiga las primeras 100 historias (sin el loop de paginacion)
2. Agregar una nueva query separada `all-archived-stories` con `enabled: false` que usa el loop de paginacion actual para traer todas -- se activa manualmente con `refetch`
3. Exportar ambos conjuntos y una funcion `fetchAllArchived` desde el hook

**File: `src/components/ventas/StoryStoreSales.tsx`**
1. En el tab de "Archivadas", mostrar solo las 100 mas recientes
2. Si hay exactamente 100 (indicando que probablemente hay mas), mostrar un boton "Ver todas las archivadas"
3. Al hacer click, abrir un `Dialog` que llama `fetchAllArchived()`, muestra un loading spinner mientras carga, y luego renderiza el grid completo de historias archivadas con scroll
4. Dentro del dialog, reutilizar el mismo componente de grid/cards que ya existe

### Resultado
- Carga inicial mucho mas rapida (1 query de 100 rows vs loop de miles)
- El usuario solo carga todas las archivadas si realmente las necesita
- Sin cambios en funcionalidad -- las historias vendidas siguen funcionando igual

