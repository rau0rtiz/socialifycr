

## Plan: Refocus level descriptions on digital marketing strategy

Update the 6 `levelData` descriptions in `src/components/funnel/ResultsStep.tsx` to frame each level as a marketing strategy recommendation rather than a generic business stage assessment.

### Changes (single file: `ResultsStep.tsx`, lines 13-19)

Replace each `desc` to follow the pattern "Tu estrategia de marketing digital se debería enfocar en...":

1. **Idea** → "Tu estrategia de marketing digital debería enfocarse en validar tu idea con contenido orgánico y construir una audiencia inicial antes de invertir en pauta."
2. **Startup** → "Tu estrategia de marketing digital debería enfocarse en generar tracción con contenido consistente y campañas de bajo presupuesto para atraer tus primeros clientes."
3. **Growing** → "Tu estrategia de marketing digital debería enfocarse en sistematizar tu contenido, escalar pauta pagada y construir embudos de conversión automatizados."
4. **Scaling** → "Tu estrategia de marketing digital debería enfocarse en diversificar canales, optimizar el costo por adquisición y delegar la operación creativa."
5. **Established** → "Tu estrategia de marketing digital debería enfocarse en expandir a nuevos mercados, fortalecer tu marca personal y maximizar el retorno de cada canal."
6. **Empire** → "Tu estrategia de marketing digital debería enfocarse en liderazgo de marca, alianzas estratégicas y crecimiento exponencial a través de múltiples plataformas."

No structural or logic changes — only the 6 description strings.

