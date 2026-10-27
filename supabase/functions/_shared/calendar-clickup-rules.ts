export function listBelongsToSpace(list: { space?: { id?: string | number } }, spaceId: string) {
  return String(list.space?.id ?? '') === spaceId;
}

// Production lists are discovered anew on every sync, not saved as an import filter.
export function calendarSpaceListIds(folders: { lists?: { id: string | number }[] }[], looseLists: { id: string | number }[]) {
  return [...new Set([...folders.flatMap(folder => folder.lists ?? []), ...looseLists].map(list => String(list.id)))];
}

export function calendarSpaceConfigFields(space: { id: string | number; name: string }) {
  return { space_id: String(space.id), space_name: space.name, list_id: null, list_name: null };
}

export function publicationDueDate(date: string) {
  return Date.parse(`${date}T12:00:00-06:00`);
}

export function isClickUpApproved(status: { status?: string } | null | undefined) {
  const name = (status?.status ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^(aprobado|aprobada|approved)$/.test(name);
}

export function isClickUpCalendarExcluded(status: { status?: string } | null | undefined) {
  const name = (status?.status ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  return isClickUpApproved(status) || /^(subida|subida a milanote|subido|aprobado\s*&\s*milanote)$/.test(name);
}

export function calendarFinalStatusPatch(task: { status?: { status?: string; type?: string }; date_closed?: string | null; date_done?: string | null }, since?: string | number | null) {
  if (!isClickUpCalendarExcluded(task.status)) return {};
  const value = since ?? (task.status?.type === 'closed' ? task.date_closed : task.status?.type === 'done' ? task.date_done : null);
  const timestamp = value ? Number(value) : NaN;
  const date = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp - 6 * 3600000).toISOString().slice(0, 10) : null;
  return { status: 'aprobado', ...(date ? { publish_date: date } : {}) };
}

// A missing list entry or a permissions/network failure is not proof of deletion.
export function isClickUpTaskDeleted(status: number, details: string) {
  if (status !== 404) return false;
  try {
    const body = JSON.parse(details);
    return body.ECODE === 'ITEM_013' && /^task not found(?:, deleted)?$/i.test(String(body.err ?? '').trim());
  } catch {
    return false;
  }
}

const calendarTypes: Record<string, string> = {
  REEL: 'reel', STORY: 'story', POST: 'post', FOTO: 'foto',
  CARRUSEL: 'carrusel', 'DISEÑO': 'diseno', DISENO: 'diseno', CORREO: 'correo',
  TIKTOK: 'tiktok', SHORT: 'short', CONTENIDO: 'otro',
};
const calendarPlatforms: Record<string, string> = { IG: 'instagram', TT: 'tiktok', YT: 'youtube', LI: 'linkedin', MULTI: 'multi' };

export function parseCalendarTaskTitle(name: string) {
  if (/^(?:\[\d+\]\s*)?\[PRODUCCI[ÓO]N\]/i.test(name)) return null;
  const match = name.match(/^(?:\[\d+\]\s*)?\[([A-ZÑ]+)(?:\s*·\s*([A-Z]+))?\]\s*(.+)$/i);
  if (!match) return { contentType: 'otro', platform: null, title: name.trim() };
  return {
    contentType: calendarTypes[match[1].toUpperCase()] ?? 'otro',
    platform: match[2] ? (calendarPlatforms[match[2].toUpperCase()] ?? null) : null,
    title: match[3].trim() || name,
  };
}

export function shouldShowCalendarPiece(item: { publish_date?: string | null; clickup_approved?: boolean }) {
  return !item.clickup_approved;
}

export function calendarDeliveryPatch(date: string | null) {
  return { publish_date: date };
}

// Editing deadlines in ClickUp never determine calendar delivery dates.
export function calendarSyncFields(task: { url?: string | null; due_date?: unknown }, title: string) {
  return { title, clickup_url: task.url || null };
}

export function calendarTaskPayload(item: {
  id: string; title: string; content_type?: string | null;
  copy?: string | null; explanation?: string | null; video_url?: string | null;
  publish_date?: string | null;
}) {
  return {
    name: `[${item.content_type?.toUpperCase() ?? 'CONTENIDO'}] ${item.title}`,
    markdown_description: [item.copy, item.explanation, item.video_url, `Calendario Socialify · ${item.id}`].filter(Boolean).join('\n\n'),
  };
}