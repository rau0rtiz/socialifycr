
# Ad Frameworks Builder (herramienta interna de la agencia)

Nueva sección **`/ad-frameworks`** visible solo para usuarios de agencia (owner/admin/manager + media_buyer/closer/setter). Te permite construir frameworks reutilizables tipo template, y para cada framework generar la matriz de anuncios (ángulo × formato × hook) con un canvas estilo Milanote para trabajar cada variante.

## 1. Concepto y flujo

**Dos niveles de jerarquía:**

```
Framework (template)         → ej: "Ad Framework v1"
   ├── Dimensiones configurables
   │     ├── Ángulos:  [Dolores, Transformación, Social Proof, Autoridad]
   │     ├── Formatos: [Founder, UGC, Demo]
   │     └── Hooks:    [Pregunta, Estadística, Contrarian]
   │
   └── Campañas/Proyectos basados en este framework
         └── Matriz 4×3×3 = 36 Ad Variants
               └── cada variante: copy, guion, status, asset, notas
```

**Flujo del usuario:**
1. Va a `/ad-frameworks` → ve lista de frameworks creados.
2. Click "Nuevo framework" → builder donde define las 3 dimensiones (con valores por defecto pre-cargados que vienen del framework v1 que pediste).
3. Una vez creado el framework, puede crear **Campañas** basadas en él.
4. Al crear la campaña, el sistema **auto-genera la matriz completa** de variantes (36 en este caso) cada una marcada como "borrador".
5. Vista canvas tipo Milanote para trabajar las variantes.

## 2. Página `/ad-frameworks` — Lista de frameworks

**Header:** Título "Ad Frameworks", botón "+ Nuevo framework"

**Grid de tarjetas (cards):**
```
┌─────────────────────────────────────┐
│ Ad Framework v1                  ⋮  │
│ 4 ángulos × 3 formatos × 3 hooks    │
│ = 36 variantes por campaña          │
│                                     │
│ 3 campañas activas · 87 variantes   │
│ Actualizado hace 2 días             │
└─────────────────────────────────────┘
```

Acciones por card: **Abrir**, **Duplicar**, **Editar**, **Eliminar**.

## 3. Builder de Framework (template)

Vista para crear/editar un framework. **Tres secciones colapsables**, una por dimensión:

```
┌─ Ángulos ──────────────────────────[+ Agregar]┐
│ ⠿ Dolores            [Color] [Descripción] [×]│
│ ⠿ Transformación     [Color] [Descripción] [×]│
│ ⠿ Social Proof       [Color] [Descripción] [×]│
│ ⠿ Autoridad          [Color] [Descripción] [×]│
└───────────────────────────────────────────────┘

┌─ Formatos ─────────────────────────[+ Agregar]┐
│ ⠿ Founder            [Descripción]         [×]│
│ ⠿ UGC                [Descripción]         [×]│
│ ⠿ Demo               [Descripción]         [×]│
└───────────────────────────────────────────────┘

┌─ Hooks ────────────────────────────[+ Agregar]┐
│ ⠿ Pregunta           [Descripción]         [×]│
│ ⠿ Estadística (dato) [Descripción]         [×]│
│ ⠿ Contrarian         [Descripción]         [×]│
└───────────────────────────────────────────────┘

Total: 4 × 3 × 3 = 36 variantes por campaña
```

- Drag & drop para reordenar (`@dnd-kit/sortable` ya disponible en stack o `framer-motion`).
- Cada item tiene nombre obligatorio, descripción opcional, color opcional (para los ángulos, así se distinguen visualmente en el canvas).
- Counter en vivo de variantes totales.
- Validación: al menos 1 valor en cada dimensión.

**Pre-set inicial al cargar el primer framework:** los valores que pediste ya pre-llenados.

## 4. Campañas dentro de un framework

Al abrir un framework verás:
- Header con datos del framework
- Botón "+ Nueva campaña"
- Lista de campañas:

```
┌──────────────────────────────────────────────┐
│ Campaña: Lanzamiento The Mind Coach Q2       │
│ Cliente: The Mind Coach (opcional link)      │
│ 36 variantes — 8 listas, 12 en progreso, 16 │
│ borradores                                   │
│ [Abrir canvas]  [⋮]                          │
└──────────────────────────────────────────────┘
```

**Crear campaña:** modal pidiendo nombre, descripción, cliente opcional (selector de `clients`), fecha objetivo. Al guardar, se generan automáticamente las N variantes vacías (status `draft`).

## 5. Canvas estilo Milanote (la matriz)

Vista principal de una campaña. **Vista por defecto: matriz tipo grid**, con toggle a **vista canvas libre**.

### Vista Matriz (default)

Una pestaña por **Ángulo**, dentro grid `formato × hook`:

```
[Dolores] [Transformación] [Social Proof] [Autoridad]   ← tabs

Ángulo: Dolores
              Pregunta        Estadística     Contrarian
Founder    [card variante]  [card variante]  [card variante]
UGC        [card variante]  [card variante]  [card variante]
Demo       [card variante]  [card variante]  [card variante]
```

**Card de variante (mini):**
```
┌────────────────────────────┐
│ [thumbnail o ícono]        │
│ Hook: "¿Y si tu cabeza..."│
│ ● En progreso              │
│ 📎 2 assets                │
└────────────────────────────┘
```
Click → abre **panel lateral** (sheet) con detalle editable.

### Panel detalle de variante

```
Ángulo: Dolores · Formato: Founder · Hook: Pregunta

┌─ Hook (línea de apertura) ────┐
│ "¿Y si tu cabeza no es el     │
│  problema?"                   │
└───────────────────────────────┘

┌─ Guion / Script ──────────────┐
│ [textarea grande]             │
└───────────────────────────────┘

┌─ Copy del anuncio ────────────┐
│ [textarea]                    │
└───────────────────────────────┘

┌─ CTA ─────────────────────────┐
│ [input]                       │
└───────────────────────────────┘

┌─ Assets / Referencias ────────┐
│ [📎 Drop o pegar URLs]        │
│ • thumbnail.jpg               │
│ • figma-link                  │
└───────────────────────────────┘

┌─ Notas ───────────────────────┐
│ [textarea]                    │
└───────────────────────────────┘

Status: ○ Borrador  ◉ En progreso  ○ Listo  ○ Publicado
Asignado a: [selector team agency]
```

Todos los campos guardan en debounce (autosave 800ms).

### Vista Canvas libre (Milanote-style) — opcional fase 2

Cada card es draggable, con conexiones (líneas) entre ellas. Para fase 1 dejar solo la matriz, ya que cubre el 90% del valor real. Marcar como roadmap.

## 6. Permisos

- Solo agencia (owner/admin/manager/media_buyer/closer/setter) puede acceder.
- **Owner/admin/manager** → CRUD frameworks y campañas.
- **media_buyer/closer/setter** → ver + editar variantes de campañas, no crear/borrar frameworks.
- **Clientes** → no ven nada de esto (no aparece en sidebar).
- Posibilidad futura: campaña linkeada a un `client_id` y compartida con su equipo (lo dejamos preparado en el schema con `client_id` nullable y RLS abierta a `has_client_access` cuando esté seteado, pero el toggle "compartir con cliente" lo dejamos OFF por defecto).

## 7. Esquema de base de datos

**4 tablas nuevas:**

```text
ad_frameworks
  id, name, description, created_by, created_at, updated_at
  (sin client_id — son globales de la agencia)

ad_framework_dimensions
  id, framework_id, dimension_type ('angle'|'format'|'hook'),
  label, description, color, position
  (lista plana, agrupada por dimension_type)

ad_campaigns
  id, framework_id, name, description, client_id (nullable),
  target_date, status, created_by, created_at, updated_at

ad_variants
  id, campaign_id, angle_id, format_id, hook_id,
  hook_text, script, copy, cta, assets (jsonb),
  notes, status ('draft'|'in_progress'|'ready'|'published'),
  assigned_to (uuid nullable), created_at, updated_at
  UNIQUE (campaign_id, angle_id, format_id, hook_id)
```

**RLS (estricto agencia):**
- `SELECT/INSERT/UPDATE/DELETE` permitido si `is_admin_or_higher(auth.uid())` **OR** el usuario tiene rol de sistema en `('manager','media_buyer','closer','setter')`.
- Para `ad_campaigns` con `client_id` no null: además permitir lectura a miembros del cliente vía `has_client_access` (preparado para fase futura, no expuesto en UI ahora).

**Trigger de auto-generación:**
- Función `generate_ad_variants(_campaign_id)` que hace `INSERT … SELECT` del producto cartesiano de las dimensiones del framework asociado. Se llama automáticamente vía trigger `AFTER INSERT ON ad_campaigns`.
- Si después agregas/quitas dimensiones al framework, ofrecemos botón manual "Sincronizar variantes" en cada campaña (no automático para no perder trabajo).

## 8. Navegación

**Sidebar (sección Management, solo agencia):**
- Agregar item: **"Ad Frameworks"** con ícono `Layers` o `LayoutGrid`, ruta `/ad-frameworks`.
- Posición: justo debajo de "Widget Catalog" (otra herramienta interna).

**Rutas:**
- `/ad-frameworks` — lista
- `/ad-frameworks/:id` — vista de un framework con sus campañas
- `/ad-frameworks/:id/campaigns/:campaignId` — canvas/matriz de la campaña

Todas envueltas en `ProtectedRoute` + `RoleProtectedRoute requireAgency`.

## 9. Hooks y queries (TanStack Query)

- `use-ad-frameworks.ts` — listar/crear/editar/eliminar frameworks + dimensiones.
- `use-ad-campaigns.ts` — campañas de un framework, crear con auto-generación.
- `use-ad-variants.ts` — variantes de una campaña, update granular con debounce.

Cache `staleTime: 5min`, invalidación por `framework_id` y `campaign_id`.

## 10. Archivos a crear

**Páginas:**
- `src/pages/AdFrameworks.tsx` — lista
- `src/pages/AdFrameworkDetail.tsx` — un framework + campañas
- `src/pages/AdCampaignCanvas.tsx` — matriz de variantes

**Componentes:**
- `src/components/ad-frameworks/FrameworkCard.tsx`
- `src/components/ad-frameworks/FrameworkBuilder.tsx` (modal/sheet edición de dimensiones)
- `src/components/ad-frameworks/DimensionEditor.tsx` (drag-and-drop list por tipo)
- `src/components/ad-frameworks/CampaignCard.tsx`
- `src/components/ad-frameworks/NewCampaignDialog.tsx`
- `src/components/ad-frameworks/VariantMatrix.tsx` (grid formato × hook por ángulo)
- `src/components/ad-frameworks/VariantCard.tsx` (mini card)
- `src/components/ad-frameworks/VariantDetailSheet.tsx` (panel lateral edición)

**Hooks:**
- `src/hooks/use-ad-frameworks.ts`
- `src/hooks/use-ad-campaigns.ts`
- `src/hooks/use-ad-variants.ts`

**Migración:**
- 4 tablas + RLS + función `generate_ad_variants` + trigger + seed del Framework v1 con sus valores predefinidos.

## 11. Archivos a modificar

- `src/App.tsx` — registrar 3 rutas nuevas con lazy load + RoleProtectedRoute.
- `src/components/dashboard/Sidebar.tsx` — agregar "Ad Frameworks" en `managementMenuItems`.

## 12. Fuera de alcance (fase 2)

- Vista canvas libre con conexiones entre cards (Milanote real).
- Generación de copys/scripts con IA (Lovable AI gateway) por variante.
- Vincular variante con un anuncio real de Meta (`ads`) para tracking de performance.
- Compartir framework/campaña con cliente específico vía toggle.
- Plantillas de framework predefinidas (galería).

Cuando la base esté funcionando, cualquiera de estos suma muy poco esfuerzo porque el schema ya está pensado para soportarlos.
