export const pieceFields = ['concept', 'description', 'hook', 'script', 'cta', 'tech_notes', 'content_type', 'platform', 'duration_estimate', 'file_names', 'notes', 'done', 'is_draft'] as const;
export const contentTypes = ['reel', 'story', 'post', 'tiktok', 'short', 'otro', 'foto', 'carrusel', 'diseno', 'correo'];
export function piecePatch(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!pieceFields.some(field => field === key)) throw new Error(`Campo no editable: ${key}`);
    if (key === 'done' || key === 'is_draft') {
      if (typeof value !== 'boolean') throw new Error(`${key} debe ser booleano`);
    } else if (value !== null && (typeof value !== 'string' || value.length > 20000)) throw new Error(`Texto inválido: ${key}`);
    if (key === 'concept' && (typeof value !== 'string' || !value.trim() || value.length > 180)) throw new Error('El título debe ser breve (máximo 180 caracteres).');
    if (key === 'content_type' && value !== null && !contentTypes.includes(String(value))) throw new Error('Tipo de pieza inválido');
    if (key === 'platform' && value !== null && !['instagram','tiktok','youtube','linkedin','multi','facebook'].includes(String(value))) throw new Error('Plataforma inválida');
    out[key] = value;
  }
  if (!Object.keys(out).length) throw new Error('No hay cambios');
  return out;
}
export function moveText(source: string | null, target: string | null): string {
  return [target?.trim(), source?.trim()].filter(Boolean).join('\n\n');
}
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined) return (after ?? 0) - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
