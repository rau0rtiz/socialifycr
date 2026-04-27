# Framework MASTERCLASS para The Mind Coach

## 1. Crear el framework MASTERCLASS (semilla en BD)

Se crea una migración que inserta:

**Framework**
- Nombre: `MASTERCLASS`
- Descripción: "Framework de pauta y contenido para masterclass de The Mind Coach. 4 formatos × 3 ángulos psicológicos."

**Dimensiones (3 hooks, 4 formatos, 3 ángulos):**

- **Ángulos (hooks psicológicos):**
  1. Dolor — rojo
  2. Transformación — verde
  3. Autoridad — azul

- **Formatos:**
  1. Historias Puro Texto (1 por ángulo → 3 piezas)
  2. Historias de Respuesta (2 por ángulo → 6 piezas)
  3. Anuncios cortos 20s (1 por ángulo → 3 piezas)
  4. Contenido Orgánico + CTA (aplica a todo el contenido del periodo)

- **Hooks (mismos 3 ángulos psicológicos):** Dolor, Transformación, Autoridad

> Nota: el cartesian product genera 3×4×3=36 variantes base. Como Historias de Respuesta requiere 2 piezas por ángulo, dejamos eso como instrucción dentro de la descripción del formato — el usuario duplicará manualmente esa fila si quiere 2 entradas separadas. Alternativa abajo en "Decisiones a confirmar".

## 2. Crear automáticamente la primera campaña asignada a The Mind Coach

La migración también inserta una campaña inicial `MASTERCLASS — Lanzamiento` vinculada al `client_id` de The Mind Coach, lista para que el cliente la vea en su sección.

## 3. Nueva sección "MASTERCLASS" en el sidebar de The Mind Coach

- Agregar entrada en `src/components/dashboard/Sidebar.tsx` con icono `GraduationCap`, ruta `/masterclass`.
- Visible solo cuando `selectedClient?.name` incluye "mind coach" (mismo patrón que "Comisiones") y para usuarios con acceso al cliente (no requiere ser agencia).
- Añadir feature flag `masterclass_section` (default `true` para The Mind Coach) por consistencia con el sistema, pero la condición dura es por nombre del cliente.

## 4. Nueva página `/masterclass` (vista cliente)

Archivo: `src/pages/MindCoachMasterclass.tsx`

Layout:
- Header: "MASTERCLASS — Framework de Contenido y Pauta"
- Subtítulo explicativo del framework (4 formatos × 3 ángulos).
- Lista de campañas MASTERCLASS asignadas a The Mind Coach (`ad_campaigns` filtradas por `framework_id` MASTERCLASS + `client_id` del cliente actual).
- Cada campaña abre el canvas existente (`/ad-frameworks/:id/campaigns/:campaignId`) reutilizando el `VariantDetailSheet` ya implementado, así el cliente puede colaborar en cada variante (script, hook, copy, referencias, asignación, estado).
- Si el usuario es agency, además muestra botón "+ Nueva campaña MASTERCLASS".

## 5. RLS — sin cambios de schema necesarios

Las policies actuales ya permiten:
- `ad_campaigns` SELECT: agency O `has_client_access(client_id)` ✅
- `ad_variants` SELECT: agency O acceso al cliente vía campaign ✅
- `ad_framework_dimensions` SELECT: solo agency ❌ → **necesita policy nueva** para que el cliente vea las dimensiones (Dolor, Anuncios 20s, etc.) cuando entra a una campaña asignada a él.
- `ad_framework_references` SELECT: solo agency ❌ → **necesita policy nueva** análoga.
- `ad_frameworks` SELECT: solo agency ❌ → **necesita policy nueva** para leer el framework asociado a una campaña que tiene acceso.

Nuevas policies (SELECT only, sin permitir editar):
```sql
-- Cliente puede leer dimensiones de frameworks usados en campañas de su cliente
CREATE POLICY "Clients can view dimensions of their campaigns"
ON ad_framework_dimensions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM ad_campaigns c
  WHERE c.framework_id = ad_framework_dimensions.framework_id
    AND c.client_id IS NOT NULL
    AND has_client_access(auth.uid(), c.client_id)
));
-- Idem para ad_frameworks y ad_framework_references (filtrando por variant→campaign→client)
```

## 6. Decisiones a confirmar antes de implementar

1. **Historias de Respuesta = 2 por ángulo:** ¿Las generamos como 2 hooks "Dolor A" / "Dolor B" (rompe la matriz uniforme), o dejamos 1 variante por celda y el operador duplica manualmente la variante en el canvas (ya soportado)? → mi recomendación: **dejar 1 por celda** y que la nota del formato indique "crear 2 variaciones por ángulo".
2. **Contenido Orgánico = "agregar CTA":** ¿Lo modelamos como formato dentro de la matriz (genera 3 variantes, una por ángulo, donde el script es solo "CTA a usar"), o como una nota global del framework? → recomendación: **formato en la matriz** con descripción "Agregar este CTA a todo el contenido orgánico del periodo".

## 7. Resumen de archivos

**Migraciones:**
- `supabase/migrations/<ts>_masterclass_framework.sql` — inserta framework, dimensiones, campaña inicial; añade 3 RLS SELECT policies para clientes; opcional flag `masterclass_section`.

**Frontend:**
- `src/pages/MindCoachMasterclass.tsx` (nuevo)
- `src/App.tsx` — registrar ruta `/masterclass`
- `src/components/dashboard/Sidebar.tsx` — añadir entrada condicional a "Mind Coach"

**Sin cambios:** hooks de ad-frameworks, FrameworkBuilder, VariantDetailSheet, ReferenceCard (se reutilizan tal cual).
