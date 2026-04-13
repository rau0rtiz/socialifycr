

## Problem

The Meta API's `/stories` endpoint returns a default page size of 25 stories. The current edge function (`meta-api`, case `'stories'`) makes a single request and stops — it never follows `paging.next` cursors. That's why only 25 stories show as "active" even when there are 40+.

**How active vs archived works:**
- **Active** = fetched live from Meta's API (`/{instagramId}/stories`) — only stories still within their 24h window
- **Archived** = saved in the `archived_stories` database table by the `capture-stories` edge function

## Fix

**File: `supabase/functions/meta-api/index.ts`** (case `'stories'`, lines 1033-1086)

Add a pagination loop to follow `paging.next` URLs until all active stories are retrieved:

```typescript
// Instead of a single fetch, loop through all pages
let allStories: any[] = [];
let nextUrl: string | null = storiesUrl;

while (nextUrl) {
  const res = await fetch(nextUrl);
  const page = await res.json();
  if (page.error) { /* handle error */ break; }
  allStories = allStories.concat(page.data || []);
  nextUrl = page.paging?.next || null;
}
```

Then enrich **all** collected stories with insights (same as current logic), using `allStories` instead of `storiesData.data`.

Also add `&limit=100` to the initial URL to reduce the number of pagination round-trips.

No changes needed on the frontend — `use-stories.ts` already handles however many stories the API returns.

