import { describe, expect, it } from 'vitest';
import { creativePageId, creativeVideoId, directVideoSource } from '../../supabase/functions/_shared/dashboard-video';
describe('exact ad video resolution', () => {
  it('prioritizes the actual creative video over nested alternatives', () => {
    expect(creativeVideoId({ video_id: '123', object_story_spec: { video_data: { video_id: '456' } } })).toBe('123');
  });
  it('resolves the same creative nested video without substituting another ad', () => {
    expect(creativeVideoId({ object_story_spec: { video_data: { video_id: '456' } } })).toBe('456');
    expect(creativeVideoId({})).toBeNull();
  });
  it('uses the owning page for page-token access', () => {
    expect(creativePageId({ effective_object_story_id: '111_222' })).toBe('111');
    expect(creativePageId({ object_story_spec: { page_id: '333' }, effective_object_story_id: '111_222' })).toBe('333');
  });
  it('rejects unsafe sources', () => {
    expect(directVideoSource('https://video.example.com/exact.mp4')).toBe('https://video.example.com/exact.mp4');
    expect(directVideoSource('javascript:alert(1)')).toBeNull();
  });
});