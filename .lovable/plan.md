

## Fix Story Preview Scale in Ventas por Historias

### Problem
The aspect ratio was changed to `3/4` but should be `9/16` (native story ratio). The real issue is the image scaling: `object-contain` leaves whitespace inside the container, making previews look cropped/washed out. The working `StoriesSection` uses `object-cover` consistently.

### Solution — File: `src/components/ventas/StoryStoreSales.tsx`

1. **Revert aspect ratio** back to `aspect-[9/16]` on both StoryCard containers (lines ~311 and ~392)
2. **Use `object-cover` consistently** on all thumbnail images — the `StoryImage` component currently uses whatever className is passed, but the grid card rendering at line 319 passes `previewClassName` from `getStoryPreviewProps` which is already `object-cover` — that's correct
3. **Ensure `referrerPolicy="no-referrer"` and `crossOrigin="anonymous"`** are on the `<img>` tag inside `StoryImage` (matching the working `StoriesSection` pattern)
4. **Dialog preview** (lines ~278-296): keep `object-contain` there since it's a larger detail view where fitting the whole image matters

### Changes Summary
- Lines 311, 392: `aspect-[3/4]` → `aspect-[9/16]`
- `StoryImage` `<img>` tag: add `referrerPolicy="no-referrer"` and `crossOrigin="anonymous"` if missing
- Verify `previewClassName` passed to StoryCard thumbnails is `object-cover`

