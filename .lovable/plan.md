## Cambios solicitados

### 1. Categorías inline en creación de producto
En `ProductFormDialog.tsx`, al lado del Select de Categoría agregar un mini-formulario expandible:
- Botón "+ Nueva categoría" abajo del Select.
- Al hacer clic: aparece un input + color picker compacto + botones Guardar/Cancelar.
- Al guardar: llama `addCategory.mutateAsync` del hook `useClientProductCategories` (ya existe) y selecciona automáticamente la categoría recién creada.
- Si no hay categorías y se usa el input crudo (línea 302), se reemplaza por el mismo flujo unificado.

### 2. Ocultar "Servicio" para Tissue
En `ProductFormDialog.tsx`:
- Importar `useBrand` y derivar `isTissue` desde el cliente seleccionado.
- Si `isTissue`: no renderizar el selector de tipo (Producto/Servicio); forzar `productType = 'product'`.
- Esto también oculta toda la lógica de duración, etc.

En `ProductsManager.tsx`:
- Si `isTissue`, ocultar también el botón / atajos de "Nuevo servicio" si existen.

### 3. Eliminar a Dra Silvia como cliente
- Migración SQL para eliminar el cliente "Dra Silvia" (búsqueda case-insensitive `LOWER(name) LIKE '%silvia%'`).
- Esto cascada-borrará: team members, ventas, agendas, productos, conexiones, feature flags, invitaciones, etc. (asumiendo FKs con ON DELETE CASCADE — verificar antes).
- Si hay FKs sin cascade, eliminar primero los hijos en orden (sales → appointments → products → connections → team_members → invitations → client).

### Archivos a editar
- `src/components/ventas/ProductFormDialog.tsx` — inline category creation + hide service for Tissue.
- `src/components/ventas/ProductsManager.tsx` — hide service shortcuts for Tissue.
- Nueva migración SQL — borrar cliente Silvia y dependencias.

### Notas
- `isTissue` se obtiene con `selectedClient?.name?.toLowerCase().includes('tissue')` (patrón ya en uso).
- La migración es destructiva e irreversible — confirmar con el usuario antes de ejecutarla (aprobará al aceptar el plan).
