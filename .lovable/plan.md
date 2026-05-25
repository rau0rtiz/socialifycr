## Diagnóstico

Es culpa nuestra (del dashboard), no del formulario. Verifiqué un lead real en la base: el formulario **sí está guardando todo** en `answers`:

```
{ source: 'website-contact-form', kind: 'contacto', brand: 'kjn kja',
  tried: 'lkhbolblo', challenge: 'kjnojnl.jbl.jb',
  utm_source, utm_medium, utm_campaign }
```

El dialog de detalle en `AgencyLeadsContent.tsx` (rama `isWebContact`) solo pinta:
- Email, Teléfono, Asunto (industry), Mensaje (challenge), y un campo `ans.social_network` que **no existe** en lo que envía el form.

Por eso se ven UTMs pero faltan `kind`, `brand` y `tried`.

## Fix

En `src/components/comunicaciones/AgencyLeadsContent.tsx`, dentro del `isWebContact === true` del diálogo (~líneas 555-561):

1. Quitar el bloque de `ans.social_network` (clave fantasma).
2. Agregar tres filas nuevas en el grid cuando existan:
   - **Tipo de consulta** → `ans.kind` (mapear `contacto`→"Contacto general", `demo`→"Solicita demo", etc. — usar el valor crudo capitalizado si no hay match).
   - **Negocio / Marca** → `ans.brand`.
   - **Qué han intentado** → `ans.tried` (en una caja `bg-muted` aparte si es largo, mismo estilo que el bloque Mensaje).
3. Mantener el bloque Mensaje (`selectedLead.challenge || ans.challenge`) tal cual.

No tocar la rama del quiz ni el bloque UTM (ya funciona).

## Verificación

Abrir un lead de "Formulario de contacto web" en `/comunicaciones` → Leads y confirmar que se ven Tipo, Negocio, Qué intentaron, Mensaje y UTMs.
