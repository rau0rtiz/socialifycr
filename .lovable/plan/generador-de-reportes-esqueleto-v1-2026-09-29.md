# Generador de reportes (esqueleto v1)

Una herramienta nueva en **Agencia → Reportes** que convierte tus archivos y notas en un reporte HTML animado. El reporte se guarda en Documentación como tipo "Reporte", con cliente y nombre.

## Flujo (asistente de 5 pasos)

```text
1. Básico  ->  2. Plataformas  ->  3. Resultados y comparación  ->  4. Revisión con IA  ->  5. Generar y guardar
```

**1. Básico**
- Cliente, nombre del reporte y período (desde / hasta).
- Meta general del negocio: un texto libre tuyo.
- KPIs como etiquetas: escribís cualquier nombre ("CPL", "costo por mensaje", "agendas") y la IA lo interpreta aunque no coincida exacto.

**2. Plataformas** (marcás Meta, TikTok y/o Google; cada una tiene su bloque idéntico)
- Subir varios archivos Excel, CSV o XML, cada uno con una descripción ("export de anuncios por día", "conjuntos de anuncios").
- Meta o metas de las campañas de esa plataforma (texto).
- Link a las facturas del mes de esa plataforma. Aparece arriba del reporte.
- Miniaturas opcionales: subidas por vos o tomadas del export si traen un link de imagen.

**3. Resultados del cliente y comparación**
- Resultados del cliente (opcional): fotos, hojas de cálculo o documentos, cada uno con su descripción ("ventas de setiembre desde su POS").
- Comparación (opcional): elegir un reporte anterior del mismo cliente en Documentación. La IA compara los KPIs, los puntos de mejora y cómo cambiaron los creativos.

**4. Revisión (el back and forth)**
- La IA lee todo y devuelve un borrador en texto: estructura, números clave, creativos que va a destacar y preguntas pendientes.
- Te pide las imágenes de cada creativo destacado que no tenga miniatura, una casilla por creativo (subir imagen o pegar link).
- Podés corregir con instrucciones ("no menciones la campaña X", "resalta las agendas") y regenerar el borrador.

**5. Generar**
- Con el borrador aprobado, se crea el HTML final. Lo ves en vista previa y se guarda en Documentación (sin publicar hasta que vos lo publiques).

## Estructura del reporte

- Arriba: links de facturas, uno por plataforma.
- Intro muy corta: de qué trata el reporte, qué período cubre y qué plataformas incluye.
- Por cada plataforma:
  1. Resumen de datos (tarjetas de números).
  2. Análisis contra las metas, cruzado con los resultados del cliente si los hay.
  3. KPIs importantes con su evolución (gráficos de línea o barras; si hay comparación, antes vs. ahora).
  4. Mejores y peores creativos con su miniatura y el porqué según los KPIs.
  5. Señales de alerta (si hay).
  6. Puntos positivos y puntos de mejora.
  7. Acciones concretas y simples según la meta.
- Lenguaje simple, frases cortas, sin relleno.
- Diseño: se basa en el estilo de los reportes que ya tenés (como el de KM setiembre). Tendrá animaciones al hacer scroll y se adaptará a computadora, TV y celular.

## Mi feedback / recomendaciones

- **Números calculados en código, no por la IA.** Los archivos se leen en tu navegador y las sumas, promedios y costos por acción se calculan exactos. La IA interpreta y redacta sobre esas cifras. Así evitamos números inventados, que es el riesgo más grande de este tipo de reporte.
- **Plantilla fija + contenido de IA.** La IA devuelve el contenido ordenado (textos, KPIs, datos de gráficos, creativos) y una plantilla nuestra lo arma en HTML. Así cada reporte sale consistente, con tus colores, y no se rompe. Si preferís que la IA escriba el HTML libre, lo hacemos, pero el resultado sale menos parejo.
- **Miniaturas de Meta:** los exports CSV/XML normalmente no traen la imagen, solo el nombre o ID del anuncio. Por eso el paso 4 te pide las imágenes. Más adelante podemos traerlas automático desde la conexión de Meta que ya existe.
- **Comparación:** funciona mejor si cada reporte guarda sus datos además del HTML. Los reportes nuevos los van a guardar. Contra reportes viejos, que solo tienen HTML, la IA lee el texto y la comparación sale menos precisa.
- **Modelo:** GPT Astra. Opus 5.5 no está disponible en esta configuración del proyecto.
- **Créditos:** cada borrador y cada generación usa IA. Queda bajo un interruptor nuevo "Reportes IA" en Consumo de IA.

## Detalles técnicos

- Ruta `/agencia/reportes` + item de menú; página con asistente en `src/pages/agencia/Reportes.tsx` y componentes en `src/components/report-builder/`.
- Lectura de archivos en el cliente con SheetJS (`xlsx`, cubre xlsx/csv) y `DOMParser` para XML. Se normaliza a filas/columnas y se calculan agregados; a la IA se le envía resumen + muestra de filas, no el archivo crudo.
- Archivos subidos (evidencia, miniaturas) al bucket privado `agency-private` bajo `reports/<client_id>/...`. Las miniaturas del HTML final se guardan en `content-images` (públicas) porque el reporte se comparte.
- Tabla nueva `report_builds` (client_id, período, config JSON, datos calculados JSON, borrador, proposal_id) con GRANTs y RLS solo para roles de agencia; el HTML final va a `agency_proposals` con `kind='report'`.
- Edge function `generate-client-report` (verify_jwt, rol agencia), con dos acciones: `draft` (devuelve un JSON estricto con el borrador, las preguntas y los creativos a los que les falta imagen) y `final` (contenido estructurado). Usa Responses API, `openai/gpt-6-astra`, streaming y reasoning medium. El switch `ai_switches.reports_builder` usa el helper actual.
- Plantilla HTML en `src/lib/report-template.ts`: HTML autónomo con Chart.js por CDN, animaciones con IntersectionObserver, tipografía y paleta tomadas de los reportes existentes, layout fluido (clamp) para celular, laptop y TV.
- Antes de construir reviso el HTML del reporte KM setiembre para extraer colores y estilo.
