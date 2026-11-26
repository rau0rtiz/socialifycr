export function reorderOrderedIds(ids: string[], activeId: string, overId: string): string[] {
  if (activeId === overId) return ids;

  const fromIndex = ids.indexOf(activeId);
  const toIndex = ids.indexOf(overId);
  if (fromIndex < 0 || toIndex < 0) return ids;

  const next = [...ids];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, activeId);
  return next;
}
