# Fix permisos de Ad Frameworks para clientes

## Diagnóstico

Verifiqué el caso de Jorge en The Mind Coach:

- El framework **"Masterclass: Las Bases de la Comunicación Humana"** sí tiene `client_id` = The Mind Coach → por eso lo ve listado.
- Pero su única campaña, **"Masterclass MAYO 2026"**, tiene `client_id = NULL`.
- Las políticas RLS para clientes (no-agencia) en `ad_variants`, `ad_framework_dimensions`, `ad_framework_references` y `launch_phase_tasks` validan acceso **a través de `ad_campaigns.client_id`**. Como la campaña no tiene `client_id`, las consultas devuelven 0 filas y Jorge ve el framework "vacío".

Resultado: cualquier cliente con un framework asignado ve el contenedor pero nada adentro hasta que las campañas también tengan `client_id`.

## Cambios

### 1. Migración de base de datos

**a) Backfill** — copiar `client_id` desde `ad_frameworks` hacia `ad_campaigns` donde la campaña tenga `client_id` nulo y el framework sí lo tenga.

**b) Trigger** `BEFORE INSERT OR UPDATE OF framework_id` en `ad_campaigns`: si `NEW.client_id IS NULL`, heredarlo del framework. Garantiza que campañas nuevas no rompan permisos.

**c) RLS robustecidas** — ampliar las políticas SELECT/UPDATE para clientes en estas tablas para que también respeten el `client_id` del **framework** directamente, no solo el de la campaña. Así, aunque alguien cree una campaña sin `client_id`, el cliente sigue viendo (y editando) el contenido si tiene acceso al framework:

- `ad_framework_dimensions`: SELECT permitido si tiene acceso al framework directo (vía `ad_frameworks.client_id`).
- `ad_framework_references`: idem.
- `ad_variants`: SELECT y UPDATE permitidos si tiene acceso al framework de la campaña vinculada.
- `launch_phase_tasks`: SELECT y UPDATE permitidos si tiene acceso al framework de la campaña vinculada.

**d) Permisos de edición para clientes** — agregar políticas INSERT/DELETE/UPDATE en `ad_variants`, `ad_framework_references` y `launch_phase_tasks` para usuarios con `has_client_access()` al framework correspondiente. Así Jorge puede editar variantes, agregar referencias y marcar tareas, no solo verlas.

### 2. Frontend

No requiere cambios. Los hooks ya consultan estas tablas con el client de Supabase, y las nuevas políticas resolverán la visibilidad y edición automáticamente.

## Detalles técnicos

```text
ad_campaigns          ← hereda client_id del framework (trigger + backfill)
  └─ ad_variants      ← RLS amplía a "acceso al framework"
launch_phase_tasks    ← RLS amplía a "acceso al framework"
ad_framework_dimensions    ← RLS ya cubre, pero se simplifica
ad_framework_references    ← RLS ya cubre, pero se simplifica
```

Las funciones `has_client_access()` e `is_agency_member()` ya existen y son `SECURITY DEFINER`, así que las políticas no causan recursión.

## Verificación post-deploy

1. Como Jorge en The Mind Coach: abrir el framework Masterclass → confirmar que se ven dimensions (9), variants (8), referencias y tasks.
2. Como Jorge: editar un variant (status, copy) → debe persistir.
3. Como agencia: nada cambia, todo sigue visible.
