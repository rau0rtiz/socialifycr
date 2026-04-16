

User wants only C.6 (no share button).

## Plan: Acciones concretas por nivel en el resultado del funnel

### Cambio único en `src/components/funnel/ResultsStep.tsx`

Agregar un array `levelActions` con 3 acciones específicas por nivel y renderizarlas dentro del card del nivel actual, debajo de la descripción.

**Acciones por nivel:**

- **Nivel 1 (Idea):** Definir propuesta de valor clara / Abrir cuentas en IG y TikTok / Publicar 3 piezas validando la idea
- **Nivel 2 (Startup):** Publicar 3x/semana con 3 pilares de contenido / Activar primera campaña de tráfico ($5-10/día) / Configurar WhatsApp Business con respuestas rápidas
- **Nivel 3 (Growing):** Implementar embudo de captación con lead magnet / Escalar pauta a $20-50/día con A/B testing / Automatizar respuestas iniciales en DM
- **Nivel 4 (Scaling):** Diversificar a un 2do canal de pauta / Optimizar CAC por canal con atribución / Delegar producción creativa a un equipo
- **Nivel 5 (Established):** Expandir a nuevos mercados o segmentos / Construir marca personal del fundador / Implementar atribución multi-touch
- **Nivel 6 (Empire):** Alianzas estratégicas con marcas complementarias / Programa de afiliados o embajadores / Liderazgo de categoría con thought-leadership

**Renderizado:**
- Lista con icono `CheckCircle2` del color del nivel a la izquierda
- Texto pequeño (`text-xs md:text-sm`)
- Separador sutil arriba de la lista
- Encabezado pequeño "Próximos pasos:" en uppercase

### Detalle técnico
- Solo se modifica `ResultsStep.tsx`
- No requiere cambios en BD, edge functions, ni otros archivos
- Sin botón de compartir

