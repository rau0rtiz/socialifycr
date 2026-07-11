## Objetivo
Adaptar la lógica de Comfortex al nuevo formulario de Meta (6 preguntas) donde ya no existe la camisa de vestir manga larga ni su variante. Solo quedan 3 categorías: **Polo**, **Columbia/Pescador (manga corta)** y **Cuello Redondo**.

## Cambios

### 1. Prompt de IA (`supabase/functions/_shared/comfortex-reply.ts`)
- **Eliminar** el bloque `CAMISA TIPO COLUMBIA` (la de vestir manga larga con precios ₡10.735 / ₡7.345 / ₡5.910).
- **Renombrar/aclarar** `POLO COLUMBIA` como **"Camisa Tipo Columbia / Pescador (manga corta)"** para que coincida con la etiqueta que ve el lead en el form.
- Agregar regla explícita: *"Comfortex ya no maneja camisas de vestir ni versiones manga larga. Todas las camisas tipo Columbia son manga corta (Pescador). Si el lead pregunta por manga larga o camisa de vestir, aclará amablemente que ese producto ya no está disponible y ofrecé las 3 opciones actuales."*
- Añadir mapeo de las nuevas preguntas del form para que la IA sepa interpretarlas:
  - Q1 `¿Qué modelo de camisa está buscando?` → categoría (Polo / Columbia-Pescador / Cuello Redondo)
  - Q2 `¿Cuántas camisas necesita?` → aplica lógica detalle vs. mayor
  - Q3 `¿Desea que las camisas tengan algún bordado?` → si Sí, adjuntar precios de bordado + digitalización
  - Q4 `¿Cuál Modelo de Camisa Tipo Polo prefiere?` → WAFFIT / JICK / COLUMBIA
  - Q5 `¿Cuál Modelo de Camisa de Cuello Redondo prefiere?` → mapear al catálogo
  - Q6 `¿Qué tan pronto necesitan los uniformes?` → urgencia

### 2. Detección de urgencia (`src/lib/comfortex-urgency.ts` y duplicado en `_shared/comfortex-reply.ts`)
- Verificar que `KEY_HINTS` capture bien la Q6 nueva ("pronto" ya está incluido → OK, no requiere cambio salvo que las opciones exactas del Sheet difieran).
- Dejar el mapeo actual (24h / 1-3d / 4-7d / cotizar) tal cual hasta ver los labels exactos del Sheet.

### 3. Pendiente hasta recibir link del Sheet
- Conectar el nuevo Google Sheet como fuente adicional en **Business Setup → Instant Form Setup** (o reemplazar el actual, según decidas).
- Ajustar `getUrgencyFromLead` si los valores literales de Q6 no matchean los patrones actuales (ej. si dicen "Ya mismo" en vez de "Próximas 24 horas").

## Fuera de alcance (por ahora)
- No se toca UI del dashboard/urgencia (los buckets siguen igual).
- No se cambia el pipeline de sync ni el edge function `generate-comfortex-reply` (solo el prompt compartido).

## Siguiente paso
Confirmame el link del nuevo Sheet y si querés que **reemplace** al form viejo o se **agregue como fuente adicional**.
