## Mejoras al flujo de Frameworks

Después de revisar `AdFrameworks`, `AdFrameworkDetail`, `AdCampaignCanvas`, `FrameworkBuilder` y `VariantDetailSheet`, estos son los puntos de fricción reales y las mejoras propuestas. Cada una es independiente; podés aprobar todas o las que prefieras.

---

### 1. Edición inline en el canvas (sin abrir el sheet)

**Hoy:** para cambiar estado, fecha o tipo de creativo hay que abrir el sheet lateral, esperar a que cargue, hacer scroll y cerrarlo. Para 20–30 variantes es lento.

**Mejora:**
- Click en el badge de estado en la VariantCard → menú rápido para cambiar estado (Pendiente / En progreso / Listo / Subido).
- Click en el chip de fecha → date picker inline.
- Botón rápido (icono lápiz al hover) para cambiar tipo de creativo sin abrir sheet.
- El sheet completo queda solo para editar copy/script/slides.

---

### 2. Vista Kanban como alternativa a la matriz

**Hoy:** solo existe la vista matriz (ángulo × formato × hook). Para "qué tengo pendiente esta semana" no sirve.

**Mejora:** toggle en el canvas: **Matriz** | **Kanban** | **Calendario**.
- **Kanban:** columnas por estado (Pendiente / En progreso / Listo / Subido). Drag para mover.
- **Calendario:** mes con las variantes posicionadas en su `due_date`. Útil para ver carga semanal.

La matriz sigue siendo el default; las otras dos son vistas adicionales del mismo dataset.

---

### 3. Bulk actions sobre variantes

**Hoy:** asignar fecha o cambiar estado de 12 variantes = 12 clicks × abrir sheet.

**Mejora:**
- Checkbox en cada VariantCard (aparece al hover o con un toggle "Seleccionar").
- Barra flotante inferior con: cambiar estado, asignar fecha, asignar tipo de creativo, eliminar, duplicar.

---

### 4. Duplicar variante / campaña

**Hoy:** no existe. Si hago un Reel que funciona, tengo que copiar manualmente hook, script, copy, CTA y assets a otra celda.

**Mejora:**
- Botón "Duplicar" en el sheet de variante → copia contenido (hook_text, script, copy, cta, slides) a otra celda elegida del grid.
- "Duplicar campaña" en `AdFrameworkDetail` → crea nueva campaña con todas las variantes vacías + opción de copiar contenido.

---

### 5. Templates de framework (arranque rápido)

**Hoy:** crear framework requiere definir manualmente cada ángulo, formato y hook desde cero.

**Mejora:** al crear framework, ofrecer 2–3 plantillas pre-cargadas:
- **MASTERCLASS / Educación** (ángulos: dolor / autoridad / transformación / método; formatos: foto, reel, carrusel; hooks: pregunta / estadística / historia).
- **E-commerce / Producto** (ángulos: beneficio / social proof / objeción / urgencia).
- **En blanco** (como hoy).

El usuario puede editar todo después.

---

### 6. Indicadores visuales en cards de campaña (`AdFrameworkDetail`)

**Hoy:** la CampaignCard muestra contadores y % completado, pero no avisa de variantes vencidas ni próximas a vencer.

**Mejora:** agregar a la CampaignCard:
- Pill rojo con número de variantes vencidas (`due_date < hoy` y status ≠ published).
- Pill ámbar con variantes que vencen en ≤ 2 días.
- Próxima fecha de entrega.

---

### 7. Empty states con un botón (no varios pasos)

**Hoy:** crear framework → entrar → editar dimensiones (sheet) → cerrar → crear campaña. Son 4 saltos antes de ver una variante.

**Mejora:** al crear un framework nuevo (o entrar a uno sin dimensiones), abrir directamente el `FrameworkBuilder` en modo onboarding con los 3 grupos visibles y un botón "Listo, crear primera campaña" al final.

---

### 8. Cambios menores de claridad

- Renombrar "Sin variante" en celdas vacías por "Crear" (clickeable que dispara `sync` solo de esa celda).
- En el header del canvas: si `needsSync`, mostrar el botón "Sincronizar variantes" en color primario (no outline) con un mini badge "+N".
- Confirm dialogs (`confirm()` nativo) → `AlertDialog` consistente con el resto de la app.
- Auto-guardado: hoy hay debounce de 600 ms pero sin feedback visual. Agregar indicador "Guardado ✓" / "Guardando…" en el header del sheet.

---

### Detalles técnicos

**Archivos a tocar:**
- `src/pages/AdCampaignCanvas.tsx` — vistas Matriz/Kanban/Calendario, bulk select, edición inline, celdas vacías clickeables.
- `src/pages/AdFrameworkDetail.tsx` — pills de alerta en CampaignCard, AlertDialog, botón duplicar campaña.
- `src/pages/AdFrameworks.tsx` — selector de plantilla en el dialog de creación, AlertDialog.
- `src/components/ad-frameworks/VariantDetailSheet.tsx` — botón duplicar, indicador de guardado.
- `src/components/ad-frameworks/FrameworkBuilder.tsx` — modo onboarding cuando 0 dimensiones.
- `src/hooks/use-ad-variants.ts` — `useDuplicateVariant`, `useBulkUpdateVariants`.
- `src/hooks/use-ad-campaigns.ts` — `useDuplicateCampaign`.

**Sin cambios de DB.** Todo se construye sobre el esquema actual (`ad_variants`, `ad_campaigns`, `ad_framework_dimensions`).

**Plantillas de framework:** constantes en código (`src/lib/framework-templates.ts`), no requieren tabla. El insert al crear framework hace bulk insert a `ad_framework_dimensions`.

---

### Sugerencia de orden de implementación

Si todo es demasiado, recomiendo este orden por impacto/esfuerzo:

1. Edición inline (estado + fecha) en VariantCard — **mayor ahorro de tiempo diario**.
2. Vista Kanban (la matriz no responde a "¿qué hago hoy?").
3. Indicadores de vencidas/próximas en CampaignCard.
4. Duplicar variante.
5. Bulk actions.
6. Templates + onboarding.
7. Calendario + duplicar campaña + pulidos.

¿Querés que implemente todo, o prefieres elegir un subset?