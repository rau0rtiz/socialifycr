export const IMPORT_MODEL = 'google/gemini-3.1-flash-lite';

export type PieceRange = [number, number, number, string, string];

const labels = {
  hook: /^(?:hook|gancho)\s*[:：]\s*/i,
  script: /^(?:guion|guión|script|libreto)(?:\s+completo)?\s*[:：]\s*/i,
  cta: /^(?:cta|llamado a la acción|cierre)\s*[:：]\s*/i,
  tech_notes: /^(?:notas técnicas|indicaciones técnicas|tech_notes)\s*[:：]\s*/i,
  duration_estimate: /^(?:duración|duracion|duration_estimate)\s*[:：]\s*/i,
};

export function materializePieces(lines: string[], ranges: PieceRange[], maxShots: number) {
  if (!ranges.length || ranges.length > maxShots) throw new Error('La cantidad de piezas excede el límite. No se importó un plan parcial.');
  let lastEnd = -1;
  return ranges.map(([start, end, title, content_type, platform]) => {
    if (![start, end, title].every(Number.isInteger) || start <= lastEnd || start < 0 || end < start || end >= lines.length || title < start || title > end) {
      throw new Error('No se pudieron identificar los límites de las ideas. No se modificó el texto.');
    }
    lastEnd = end;
    const concept = lines[title];
    if (!concept) throw new Error('La idea no tiene título.');
    const block = lines.slice(start, end + 1);
    const fields = { hook: '', script: '', cta: '', tech_notes: '', duration_estimate: '' };
    let active: keyof typeof fields | undefined;
    for (const line of block) {
      const match = (Object.keys(labels) as (keyof typeof labels)[]).find((key) => labels[key].test(line));
      if (match) {
        active = match;
        fields[match] = line.replace(labels[match], '');
      } else if (/^[\p{L} _-]{1,40}[:：]/u.test(line)) {
        active = undefined;
      } else if (active) {
        fields[active] += `${fields[active] ? '\n' : ''}${line}`;
      }
    }
    const references = [...new Set(block.join('\n').match(/https?:\/\/[^\s<>"']+/gi) ?? [])]
      .map((url) => url.replace(/[),.;]+$/, ''))
      .filter((url) => /(?:instagram\.com|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|vimeo\.com|loom\.com)\//i.test(url));
    return {
      concept,
      // Keep the complete original body, including unlabelled notes and references.
      description: block.filter((_, i) => start + i !== title).join('\n'),
      ...fields,
      content_type,
      platform,
      references,
    };
  });
}