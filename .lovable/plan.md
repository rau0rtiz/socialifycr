## Problema actual

Hoy la página de Framework (detalle) y el "FrameworkBuilder" tratan **a todos los moldes igual**: muestran "Ángulos × Formatos × Hooks", el conteo `n × m × k` y un editor genérico de "dimensiones". Esto rompe la lógica de cada molde:

- **Pool**: no tiene fases ni niveles, sólo un catálogo de tipos de contenido. No debería mostrar "ángulos × formatos × hooks".
- **Awareness**: tiene 5 niveles fijos + mensajes centrales (anidados a un nivel) + tipos de contenido. Editarlos como una lista plana confunde.
- **Launch**: tiene fases ordenadas (con descripción y orden) + tipos de contenido. Necesita drag para reordenar fases y un campo de descripción.
- **Legacy matrix**: el único que sí encaja con "ángulos × formatos × hooks".

## Objetivo

Que **la página de detalle del framework** y **el setup (builder)** sean **específicos para cada molde**, mostrando sólo los conceptos que ese molde maneja, con la UI adecuada para configurarlos y un overview que tenga sentido para ese flujo.

## Cambios

### 1. Página `AdFrameworkDetail.tsx` — header y overview por molde

Reemplazar el header genérico (`Ángulos × Formatos × Hooks = N variantes/campaña`) y el grid fijo de 3 tarjetas por **un componente por molde** que renderiza:

- **Badge del molde** (icono + nombre del molde, color del molde) al lado del título.
- **Resumen contextual**:
  - **Pool** → "X tipos de contenido" + lista de chips de tipos.
  - **Awareness** → 5 columnas mini (una por nivel) con conteo de mensajes centrales por nivel y chips de tipos de contenido aparte.
  - **Launch** → línea cronológica horizontal con las fases ordenadas (chip por fase con su color y orden) + chips de tipos de contenido.
  - **Legacy** → mantener el grid actual de Ángulos / Formatos / Hooks.
- **Botón "Editar"** que abre el builder específico del molde.

Eliminar el cálculo `totalVariants = angles*formats*hooks` para moldes nuevos (no aplica). Para moldes nuevos, "Nueva campaña" estará habilitada siempre que el molde esté mínimamente configurado:
- Pool: al menos 1 tipo de contenido (o ninguno permitido — el usuario puede crear variantes "sin tipo").
- Awareness: al menos los 5 niveles (ya vienen sembrados).
- Launch: al menos 1 fase.

### 2. `FrameworkBuilder.tsx` → router por molde

Convertirlo en un router delgado que, según `framework.template_kind`, renderiza uno de:

- `LegacyMatrixBuilder` (extraer el contenido actual sin tocar lógica).
- `PoolBuilder` (nuevo).
- `AwarenessBuilder` (nuevo).
- `LaunchBuilder` (nuevo).

Cada builder vive en `src/components/ad-frameworks/builders/`.

### 3. Builders específicos

**`PoolBuilder.tsx`**
- Nombre + descripción del framework.
- Sección única: **"Catálogo de tipos de contenido"** (lista editable de `content_type`: añadir / renombrar / eliminar / color opcional).
- Sin "ángulos/formatos/hooks", sin conteos de matriz.

**`AwarenessBuilder.tsx`**
- Nombre + descripción.
- Sección **"Niveles de awareness"**: lista de 5 (ya sembrados); permite renombrar y cambiar color, **sin** añadir/eliminar (los 5 niveles son fijos por modelo de Schwartz). Con un "Restaurar nombres por defecto".
- Sección **"Mensajes centrales por nivel"**: acordeón con los 5 niveles; dentro de cada nivel, lista editable de `core_message` (cada mensaje guarda `metadata.level_id` apuntando al nivel — ya está soportado en `AwarenessView`).
- Sección **"Catálogo de tipos de contenido"** (igual que en Pool).

**`LaunchBuilder.tsx`**
- Nombre + descripción.
- Sección **"Fases del lanzamiento"**: lista ordenable de fases (label, color, descripción en `metadata.description`, orden por `position`). Botones para añadir/eliminar. Mostrar índice "FASE 1, 2, 3…" igual que en `LaunchView`.
- Sección **"Catálogo de tipos de contenido"** (catálogo libre — incluye Correos, Historias, Anuncios 20s, etc.).

### 4. Encabezado contextual del builder

Cada builder muestra arriba el icono+nombre del molde (de `getMold(template_kind)`) y una línea explicativa corta de qué se está configurando, en lugar del genérico "Define los valores de cada dimensión".

### 5. Auto-apertura del builder en onboarding

`AdFrameworkDetail` ya abre el builder cuando `dimensions.length === 0`. Mantener este comportamiento pero ahora abrirá el builder específico del molde.

### 6. Limpieza

- Quitar referencias a "ángulos × formatos × hooks" del overview cuando el molde no es `legacy_matrix`.
- En `FrameworkCard` (lista de frameworks en `AdFrameworks.tsx`), mostrar resumen acorde al molde (chip "Pool · 5 tipos", "Awareness · 12 mensajes", "Launch · 3 fases", o el conteo clásico para legacy) en vez de "Ángulos / Formatos / Hooks" para todos.

## Archivos

**Nuevos**
- `src/components/ad-frameworks/builders/PoolBuilder.tsx`
- `src/components/ad-frameworks/builders/AwarenessBuilder.tsx`
- `src/components/ad-frameworks/builders/LaunchBuilder.tsx`
- `src/components/ad-frameworks/builders/LegacyMatrixBuilder.tsx` (extracción del builder actual)
- `src/components/ad-frameworks/FrameworkOverview.tsx` (componente de overview que se renderiza según el molde)

**Editados**
- `src/components/ad-frameworks/FrameworkBuilder.tsx` → router por molde.
- `src/pages/AdFrameworkDetail.tsx` → usa `FrameworkOverview`, ajusta gating de "Nueva campaña" y elimina cálculo `n*m*k` para moldes nuevos.
- `src/pages/AdFrameworks.tsx` → `FrameworkCard` muestra resumen por molde.

## Sin cambios de base de datos

Reusamos las columnas existentes (`dimension_type`, `metadata`, `position`, `color`, `description`). Los moldes ya guardan los tipos correctos (`phase`, `awareness_level`, `core_message`, `content_type`).
