export function listBelongsToSpace(list: { space?: { id?: string | number } }, spaceId: string) {
  return String(list.space?.id ?? '') === spaceId;
}

export function publicationDueDate(date: string) {
  return Date.parse(`${date}T12:00:00-06:00`);
}