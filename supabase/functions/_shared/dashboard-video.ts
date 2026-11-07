type Creative = { video_id?: string | null; object_story_spec?: { video_data?: { video_id?: string | null }; page_id?: string | null }; effective_object_story_id?: string | null };
export function creativeVideoId(c: Creative): string | null {
  return c.video_id || c.object_story_spec?.video_data?.video_id || null;
}
export function creativePageId(c: Creative): string | null {
  return c.object_story_spec?.page_id || c.effective_object_story_id?.split('_')[0] || null;
}
export function directVideoSource(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}