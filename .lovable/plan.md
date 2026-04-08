

## Story Sales Widget for Alma Bendita

### Context
Alma Bendita sells unique second-hand clothing via Instagram stories. Each piece is one-of-a-kind, so when it sells, it's gone. We need a widget that shows their stories (active + archived) and lets them tap a story to instantly register a sale linked to that story.

### Plan

#### 1. New component: `StoryStoreSales` widget
**File**: `src/components/ventas/StoryStoreSales.tsx`

- A card with two tabs: "Activas" (live stories from Meta API) and "Archivadas" (from DB)
- Display stories in a horizontal scroll grid with 9:16 aspect-ratio thumbnails (reusing the same visual style as `StoriesSection`)
- Each story card shows the image/video thumbnail with a subtle overlay
- Clicking a story opens a dialog pre-filled to register a sale:
  - Story thumbnail preview at the top
  - Product name (free text, defaulting to "Pieza única")
  - Sale amount + currency (CRC default)
  - Customer name (optional)
  - Sale date (defaults to today)
  - Notes field
- On submit, calls the existing `useSalesTracking` hook's `addSale` to create a `message_sales` record with `source: 'story'` and stores the `story_id` in notes or a metadata field
- Also auto-increments the `daily_story_tracker` revenue for that date so the goal bar stays in sync
- Stories that already have a linked sale show a green checkmark/sold badge overlay

#### 2. Track story-sale links
**Database migration**: Add a `story_id` column to `message_sales` table (nullable text) to link a sale directly to a story. This allows marking stories as "sold" by checking if any sale references that story ID.

#### 3. Wire into Ventas page
**File**: `src/pages/Ventas.tsx`
- Add the `StoryStoreSales` widget for Alma Bendita, positioned right after the `StoryRevenueTracker` calendar
- Uses the existing `useStories` hook to fetch active + archived stories
- Passes a callback that creates the sale and updates the daily tracker in one flow

#### 4. Auto-sync with daily tracker
When a sale is registered via a story, automatically upsert the `daily_story_tracker` entry for that date, incrementing `daily_revenue` by the sale amount. This keeps the calendar tracker and goal bar consistent without manual double-entry.

### Technical details

**New DB column** (migration):
```sql
ALTER TABLE public.message_sales ADD COLUMN story_id text;
```

**Component data flow**:
```
useStories(clientId) → active + archived stories
  ↓ click story
StoryStoreSales dialog → pre-filled sale form
  ↓ submit
addSale({ source: 'story', story_id, amount, ... })
  + upsert daily_story_tracker for that date
```

**Files to create/modify**:
- Create `src/components/ventas/StoryStoreSales.tsx` — new widget
- Modify `src/pages/Ventas.tsx` — render widget for Alma Bendita
- Modify `src/hooks/use-sales-tracking.ts` — accept `story_id` in SaleInput
- DB migration — add `story_id` column to `message_sales`

