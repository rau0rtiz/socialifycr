## Rediseño Ad Frameworks: de matrices a "moldes con flujos"

### Problema actual

Todo framework está forzado al mismo modelo: **ángulos × formatos × hooks** = matriz cartesiana. Eso obliga a meter en esa caja cosas que no son matrices: una secuencia de lanzamiento, un funnel de awareness, un pool de testing. Por eso visualmente todo se ve "denso pero plano" y los flujos no tienen sentido.

### Concepto nuevo: Moldes (Templates de flujo)

Al crear un framework, escoges un **molde**. Cada molde:
- Define su propia estructura de datos (qué dimensiones existen y cómo se relacionan)
- Tiene su propia UI nativa (no una matriz genérica)
- Comparte la misma "pieza editable" (la **Variante**: tipo, estado, fecha, copy, hook, referencias)

Habrá **3 moldes** al inicio:

---

### 1. Molde "Pool" (Launchpad)

**Propósito**: pool grande de creatividades para testear con A/B.

**Estructura**:
- Una sola lista plana de variantes
- Cada variante tiene: ángulo (tag libre), formato, hook, copy
- Sin jerarquía: todo es un anuncio para producir y medir

**UI**:
- Vista por defecto: **Galería** (cards 4:5 con thumbnail, hook visible, estado, fecha)
- Filtros chip: ángulo, formato, estado
- Botón "Añadir variante" siempre visible (no se "auto-genera" matriz)
- Vistas alternas: Kanban (por estado), Calendario (por fecha)

```text
┌─────── Filtros: [Dolor] [Reel] [Listo] ───────┐
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  + Añadir       │
│  │card│ │card│ │card│ │card│                 │
│  └────┘ └────┘ └────┘ └────┘                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │card│ │card│ │card│ │card│                 │
└────────────────────────────────────────────────┘
```

---

### 2. Molde "Awareness Levels" (5 niveles)

**Propósito**: anuncios mapeados a los niveles de consciencia del prospecto (Eugene Schwartz).

**Estructura jerárquica**:
- 5 niveles fijos: Inconsciente · Consciente del problema · Consciente de la solución · Consciente del producto · Más consciente
- Cada nivel tiene **mensajes centrales** (configurables, 1-N por nivel)
- Cada mensaje central tiene **variantes** (los anuncios concretos con hook + formato)

**UI**:
- Vista por defecto: **Columnas verticales** (una por nivel) con scroll vertical interno
- Dentro de cada columna: mensajes centrales como sub-secciones colapsables, y debajo las variantes
- Header con barra de progreso por nivel
- Click en variante → sheet de edición

```text
┌Inconsciente┐┌Problema ┐┌Solución ┐┌Producto ┐┌Más cons.┐
│ ████ 60%   ││ ██ 20%  ││ ░░  0%  ││ ██ 30%  ││ ███ 50% │
├────────────┤├─────────┤├─────────┤├─────────┤├─────────┤
│▼ Mensaje 1 ││▼ Msg 1  ││▼ Msg 1  ││▼ Msg 1  ││▼ Msg 1  │
│  ┌──────┐  ││ ┌────┐  ││ ┌────┐  ││ ┌────┐  ││ ┌────┐  │
│  │ var  │  ││ │ var│  ││ │ var│  ││ │ var│  ││ │ var│  │
│  └──────┘  ││ └────┘  ││ └────┘  ││ └────┘  ││ └────┘  │
│  ┌──────┐  ││▼ Msg 2  │└─────────┘└─────────┘└─────────┘
│  │ var  │  │└─────────┘
│  └──────┘  │
│▼ Mensaje 2 │
│  + Añadir  │
└────────────┘
```

---

### 3. Molde "Launch Sequence" (MASTERCLASS)

**Propósito**: secuencia ordenada de fases para una campaña tipo lanzamiento (Pre-launch → Cart open → Cart close).

**Estructura ordenada**:
- **Fases** secuenciales (configurables: ej. "Calentamiento" → "Apertura del carrito" → "Cierre"), cada una con fechas (rango)
- Cada fase tiene **piezas de contenido** ordenadas (no es matriz, es lista posicionada)
- Cada pieza es una variante con tipo (Historia texto, Historia respuesta, Anuncio 20s, Orgánico+CTA, Correo) + hook + copy

**UI**:
- Vista por defecto: **Timeline horizontal** con fases en bloques, conectadas
- Dentro de cada fase: lista vertical de piezas con su orden
- Indicador visual del "día actual" en la timeline
- Drag para reordenar piezas dentro de una fase

```text
══════════════════════════════════════════════════════════════
   CALENTAMIENTO    │  APERTURA CARRITO  │     CIERRE
   1-7 Mar          │  8-10 Mar          │     11-12 Mar
   ████████ 80%     │  ███ 30%           │     ░ 0%
═══════════╪═════════╪══════════╪═════════╪══════════╪═══════
   ┌──────────┐     │  ┌──────────┐      │   ┌──────────┐
   │ 1. Hist. │     │  │ 1. Email │      │   │ 1. Hist. │
   │ texto    │     │  │ apertura │      │   │ urgencia │
   └──────────┘     │  └──────────┘      │   └──────────┘
   ┌──────────┐     │  ┌──────────┐      │   ┌──────────┐
   │ 2. Reel  │     │  │ 2. Hist. │      │   │ 2. Email │
   │ autorid. │     │  │ FAQ      │      │   │ último   │
   └──────────┘     │  └──────────┘      │   └──────────┘
   + Añadir pieza   │  + Añadir pieza    │   + Añadir pieza
```

---

### Pieza compartida: la Variante

Independientemente del molde, abrir una variante muestra el mismo **sheet** de edición con:
- Tipo de contenido (Foto, Reel, Carrusel, Historia texto, Historia respuesta, Anuncio 20s, Orgánico+CTA, Correo, …) — catálogo extensible
- Estado (Pendiente, En progreso, Listo, Subido)
- Fecha de publicación
- Copy
- Hook
- Referencias (links + thumbnails — ya existe)
- Notas

---

### Cambios técnicos

**Base de datos** (migración):
- Nueva columna `ad_frameworks.template_kind text` con valores: `pool`, `awareness`, `launch`, `legacy_matrix`
- Frameworks existentes → `legacy_matrix` (compatibilidad, mantienen su UI actual)
- Para los nuevos moldes, las dimensiones existentes (`ad_framework_dimensions`) se reutilizan con tipos extra:
  - `awareness`: `awareness_level` (los 5 niveles), `core_message` (mensajes centrales)
  - `launch`: `phase` (fases con `start_date`/`end_date` en `description` JSON)
- `ad_variants`:
  - `angle_id` y `format_id` pasan a `nullable` (los moldes nuevos no los exigen igual)
  - Nueva columna `position int` para orden dentro de fase/pool
  - Nueva columna `awareness_level_id` y `phase_id` y `core_message_id` (todas nullable, FK a dimensions)

**Frontend**:
- Nuevos archivos:
  - `src/lib/framework-molds.ts` — definiciones de moldes
  - `src/components/ad-frameworks/molds/PoolView.tsx`
  - `src/components/ad-frameworks/molds/AwarenessView.tsx`
  - `src/components/ad-frameworks/molds/LaunchView.tsx`
  - `src/components/ad-frameworks/molds/MoldRouter.tsx` — switch sobre `template_kind`
- Modificar:
  - `AdFrameworks.tsx` — selector visual de molde al crear (cards con preview de cada flujo)
  - `AdCampaignCanvas.tsx` — delega render a `MoldRouter` según el molde del framework
  - `AdFrameworkDetail.tsx` — la sección "Dimensiones overview" cambia según molde
- Eliminar/archivar: `AngleColumnsBoard`, `AngleSectionBoard`, `MatrixView` quedan SOLO para `legacy_matrix`
- Conservar: `VariantDetailSheet`, `VariantReferences`, `GalleryView` (se reusa en Pool), `KanbanView`, `CalendarView`

**Migración de datos existentes**:
- MASTERCLASS (framework actual) → migrar a molde `launch` con fases por defecto: "Calentamiento", "Apertura", "Cierre"
- Frameworks "Pool"/Launchpad existentes → migrar a `pool`
- Cualquier otro queda como `legacy_matrix` (la UI actual sigue funcionando para no romper)

---

### Flujo de creación nuevo

1. Click "Nuevo framework"
2. Pantalla de selección de molde con 3 cards visuales grandes:
   - **Pool** — "Pool de variantes para A/B testing"
   - **Awareness Levels** — "5 niveles de consciencia × mensajes centrales"
   - **Launch Sequence** — "Secuencia ordenada de fases (lanzamiento)"
3. Nombre + descripción
4. Configuración inicial específica del molde (ej. fases con fechas para Launch)
5. → Vista nativa del molde

---

### Lo que se conserva del sistema actual

- Modelo de Variante editable (mismo sheet)
- Sistema de referencias (URLs + embeds)
- Estados, fechas, asignaciones
- Bulk actions, selección múltiple
- Realtime sync vía TanStack Query

### Lo que cambia radicalmente

- No más "auto-generación" de matriz al crear campaña
- No más tabs por ángulo
- Cada molde tiene su propia UI dedicada y optimizada
- El usuario añade variantes manualmente donde tienen sentido

¿Apruebas este rediseño? Si sí, implemento empezando por la migración + molde Launch (para arreglar MASTERCLASS) y luego Pool y Awareness en orden.