

## Fix Story Preview Scale in Ventas por Historias

### Problem
The story cards use `aspect-[9/16]` which makes them very tall and narrow at smaller viewports. Combined with `object-cover`, images get cropped badly or appear mostly blank/washed out (as seen in the screenshot).

### Solution
Reduce the aspect ratio to something less extreme and ensure images fill the cards properly:

**File: `src/components/ventas/StoryStoreSales.tsx`**

1. **Change aspect ratio** from `aspect-[9/16]` to `aspect-[3/4]` on the StoryCard — this keeps a portrait orientation but is less extreme, showing more of each story and fitting better in the grid
2. **Keep `object-cover`** on images so they fill the card without letterboxing
3. **Adjust ScrollArea height** slightly to accommodate the shorter cards while still showing multiple rows

### Technical Details
- Line 311: Change `aspect-[9/16]` → `aspect-[3/4]`
- This single change will make the cards shorter, fitting more content visually and preventing the "washed out" look from overly tall crops

