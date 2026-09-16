# Educar al setter de IA: el precio solo cuando lo piden

## El problema

El borrador soltó el precio en el primer mensaje. Eso no es el modelo "portándose mal": la instrucción que le damos hoy incluye una línea que empuja a decir el precio ("Marketing arranca desde USD 1.200 + IVA..."), y el catálogo de precios entra al contexto sin condición alguna sobre cuándo usarlo.

## Qué cambia

1. **Regla de descubrimiento primero.** Se agrega al motor del setter una regla explícita: primero entender el negocio (a qué se dedica, qué vende, qué está haciendo hoy), y el precio solo se menciona si la persona lo pide textualmente ("cuánto cuesta", "precio", "paquetes", "tarifas", "presupuesto"). Si no lo pidió, el bot responde y hace una sola pregunta de descubrimiento, sin montos.
2. **El catálogo pasa a ser referencia condicionada.** Los precios publicados siguen llegando al contexto, pero etiquetados como "solo utilizables si la persona pregunta por precio". Se elimina la frase que hoy invita a decirlo siempre.
3. **Guardarraíl automático.** Nueva validación en el motor: si el último mensaje del contacto no pide precio y la respuesta contiene un monto, la propuesta se marca como falla y queda con "requiere revisión humana". Aplica igual en el laboratorio y en los borradores reales.
4. **Panel para educar la IA (lo que pediste).** En Chats → Configuración, el Manual comercial pasa de solo lectura a editable para admins: editás el texto, se guarda como nueva versión en borrador, la probás en el Laboratorio y recién ahí le das *Publicar*. Se agrega también un campo de **Notas de tono** y una lista de **Reglas de conversación** editables (una por línea) que se inyectan en el prompt junto al manual. Así educás al bot desde la interfaz, sin tocar código.
5. **Casos de prueba nuevos.** Se agregan 3 casos al set existente: consulta de "paquetes" sin pedir precio (no debe dar monto), pregunta directa de precio (sí debe darlo, con IVA y la pauta aparte), y pregunta vaga tipo "info" (descubrimiento, sin monto). Se corren los casos y te muestro el resultado real.

## Cómo lo vas a usar

- Chats → Configuración → Manual comercial: editar, guardar borrador, publicar.
- Chats → Laboratorio: pegar la conversación, marcar "usar manual en borrador", generar borrador y ver si respeta la regla.
- Cuando quede como querés, publicás la versión y las conversaciones reales la usan.

## Detalle técnico

- `supabase/functions/_shared/setter-agent.ts`: nueva sección `DESCUBRIMIENTO Y PRECIOS` en `buildSystemPrompt`, `formatOffers` con encabezado condicional, `priceAsked(history)` + check `no_price_without_request` en `runChecks`; `rules` y `toneNotes` desde la versión de knowledge.
- Migración: columna `rules jsonb` (por defecto `[]`) en `msg_knowledge_versions`; RPC `msg_save_knowledge_draft(p_manual, p_tone_notes, p_rules)` solo para admins que crea una nueva versión en borrador; seed de los 3 casos nuevos en `msg_test_cases`.
- `src/hooks/use-messaging.ts`: `useSaveKnowledgeDraft`.
- `src/components/chats/SettingsPanel.tsx`: editor de manual, tono y reglas con estado de guardado y publicación.
- `msg-generate-draft` y `msg-run-tests` pasan `rules` al motor; el guardarraíl fuerza `needs_human` cuando se dispara.
