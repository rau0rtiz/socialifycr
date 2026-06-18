# Plan de Producción Sheets (Agencia)

Crear una herramienta tipo "drive de producciones" en `/agencia/producciones`, inspirada visualmente en el HTML adjunto (paleta cream/ink/accent café, tipografías Cormorant Garamond + Jost), con guardado persistente y export manual a ClickUp.

## 1. Estructura de navegación

- Nueva ruta `/agencia/producciones` (sidebar Agencia, junto a CRM y Finanzas).
- Vista principal estilo "drive":
  - Filtro por cliente (carpetas visuales: una tarjeta por cliente con conteo de sheets).
  - Lista/grid de sheets con fecha, cliente, encargado, estado (Borrador / En producción / Terminada / Enviada a ClickUp).
  - Búsqueda por título, locación, encargado.
- Click en carpeta de cliente → lista filtrada de sus sheets.
- Botón "Nuevo production sheet".

## 2. Editor del Production Sheet

Una sola página con secciones colapsables, autoguardado (debounce 800ms):

1. **Header / Claqueta** — título, cliente (select), fecha, locación, hora de llamado, encargado de producción, estado.
2. **Equipo y roles** — lista editable de `{rol, nombre, clickup_user_email?}`. Roles sugeridos: Director, DP, Sonido, Wardrobe, Talento, BTS, Producción.
3. **Shot list / Escenas** — items reordenables (drag) con: número, descripción, tipo de toma, duración estimada, checkbox listo, notas. Agrupables por escena.
4. **Wardrobe & Props** — lista checkable.
5. **Notas libres** — textarea rich (Tiptap o textarea simple con markdown).
6. **Adjuntos** — opcional fase 2 (omitir en v1).

Acciones del editor:
- Guardar (auto).
- Duplicar sheet (plantilla).
- Marcar como terminada.
- "Enviar a ClickUp" (deshabilitado hasta configurar integración).

## 3. Schema (Lovable Cloud)

```text
production_sheets
  id, client_id (FK clients), title, shoot_date, location,
  call_time, producer_name, status ('draft'|'in_production'|'done'|'sent_to_clickup'),
  notes (text), clickup_task_id (text, nullable), clickup_list_id (text, nullable),
  sent_to_clickup_at (timestamptz), created_by, created_at, updated_at

production_sheet_team
  id, sheet_id (FK), role, name, clickup_user_email, sort_order

production_sheet_shots
  id, sheet_id (FK), scene_label, shot_number, description,
  shot_type, duration_estimate, done (bool), notes, sort_order

production_sheet_wardrobe
  id, sheet_id (FK), item, done (bool), sort_order

client_clickup_config
  client_id (PK, FK), workspace_id, space_id, list_id, default_assignee_emails (text[]),
  updated_at
```

RLS: acceso a miembros de agencia (`is_agency_member(auth.uid())`), con GRANTs estándar para `authenticated` y `service_role`.

## 4. Integración ClickUp (manual)

- **Setup**: pediré por chat un Personal API Token de ClickUp (Settings → Apps → Generate). Lo guardamos como secret `CLICKUP_API_TOKEN`.
- Por cliente, en una pequeña pantalla de config (modal desde la carpeta del cliente):
  - Seleccionar Workspace → Space → List de ClickUp (dropdowns poblados por edge function `clickup-meta`).
  - Asignar emails por defecto.
- **Export** (`clickup-create-tasks` edge function): al hacer click en "Enviar a ClickUp":
  - Crea **una task padre** con el título del sheet, descripción = notas + resumen.
  - **Subtasks**: una por shot pendiente + una por item de wardrobe + una por miembro del equipo (opcional, configurable).
  - Asigna por email matcheando con miembros del workspace ClickUp.
  - Guarda `clickup_task_id` y marca `sent_to_clickup_at`. Muestra link a ClickUp.
  - Botón re-enviar = actualizar task (PUT) en vez de duplicar.

## 5. Diseño visual

Adaptar la estética del HTML adjunto pero usando tokens semánticos del proyecto (sin colores hardcoded). Crear variantes nuevas en `index.css`:
- Fondo paper crema, header oscuro tipo claqueta con banda diagonal cream/ink.
- Cormorant Garamond para titulares (via @fontsource), Jost como sans.
- Solo en la página de Producciones — no contamina el resto del dashboard.

## 6. Detalles técnicos

- TanStack Query con `staleTime: 5min` (regla del proyecto).
- Hooks: `use-production-sheets`, `use-production-sheet`, `use-clickup-config`.
- Componentes en `src/components/producciones/`.
- Página `src/pages/Producciones.tsx`.
- Edge functions: `clickup-meta` (lista workspaces/spaces/lists), `clickup-create-tasks` (export).
- Memoria: guardar regla "ClickUp export es manual desde /agencia/producciones, mapping por cliente".

## 7. Fases

1. **Fase A (esta entrega)**: Schema + RLS, ruta /agencia/producciones, drive por cliente, editor completo con autoguardado, diseño NOEVAL-style, botón ClickUp deshabilitado con tooltip "Configura ClickUp primero".
2. **Fase B**: Cuando me pases el token de ClickUp → edge functions, config por cliente, export real.

¿Confirmo y arranco Fase A?
