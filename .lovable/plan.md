
## Plan: reemplazar el donut chart de leads por una visualización mejor

### Problema
El donut chart en `Comunicaciones > Funnels` (drill-down view) ocupa espacio, requiere leer la leyenda al lado, y los porcentajes pequeños son difíciles de comparar entre niveles. Pie/donut charts son notoriamente malos para comparar valores.

### Propuesta: barras horizontales apiladas por nivel
Reemplazar todo el `<Card>` del donut (líneas 348-398 de `AgencyLeadsContent.tsx`) por una visualización tipo **"distribution bars"**:

```text
NIVEL 1 · Idea         ████░░░░░░░░░░░░░░  12   (8%)
NIVEL 2 · Startup      ██████████░░░░░░░░  34  (24%)
NIVEL 3 · Growing      ████████████████░░  48  (33%) ← más grande
NIVEL 4 · Scaling      ████████░░░░░░░░░░  22  (15%) ⭐ calificado
NIVEL 5 · Established  ██████░░░░░░░░░░░░  18  (13%) ⭐
NIVEL 6 · Empire       ████░░░░░░░░░░░░░░  10   (7%) ⭐
                                            ─────
                                            144 leads · 35% calificados
```

### Diseño visual
- **6 filas**, una por nivel (siempre las 6, aunque tengan 0).
- Cada fila: chip de nivel a la izquierda (badge con color del nivel), barra de progreso horizontal en el centro (full width, color del nivel, fondo `bg-muted`), conteo + porcentaje a la derecha.
- **Highlight visual** para niveles 4-6 (calificados): pequeño ⭐ o badge "calificado" sutil al final de la fila → refuerza qué leads importan más.
- **Barra superior apilada delgada** (opcional, encima de las filas): una sola barra horizontal de 6px dividida en 6 segmentos proporcionales con los colores de cada nivel — da sensación de "totalidad" sin ser un donut.
- Animación: las barras crecen de 0% al valor real al montar (`transition-all duration-700`).
- Hover en cada fila: highlight sutil + tooltip con el nombre completo del nivel.

### Por qué es mejor
1. **Comparación directa**: el ojo compara longitudes mucho mejor que ángulos.
2. **Más información por píxel**: nombre + número + porcentaje + color, todo alineado.
3. **Mobile-friendly**: las barras se apilan naturalmente, el donut se veía minúsculo en móvil.
4. **Resalta lo accionable**: marca los calificados (4-6) que son los que el equipo de ventas quiere atacar.

### Bonus opcional
Añadir botón pequeño "Filtrar" en cada fila → al hacer click, aplica `setLevelFilter(String(level))` y la tabla de leads de abajo se filtra por ese nivel. Convierte la visualización en un control interactivo.

### Archivo a modificar
- `src/components/comunicaciones/AgencyLeadsContent.tsx` — reemplazar bloque líneas 348-398 (el `<Card>` del donut + leyenda).

Sin cambios en datos, hooks, ni nada más. Solo es un swap visual del componente.
