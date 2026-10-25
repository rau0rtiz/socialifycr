export function listBelongsToSpace(list: { space?: { id?: string | number } }, spaceId: string) {
  return String(list.space?.id ?? '') === spaceId;
}

export function publicationDueDate(date: string) {
  return Date.parse(`${date}T12:00:00-06:00`);
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