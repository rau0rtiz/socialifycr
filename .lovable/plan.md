

## Diagnosis: Why Speak Up loads slowly or appears blank

After analyzing the codebase, database, and feature flag configuration, I identified several issues that could cause the page to appear blank or take too long to load for Marco (Wanda's account):

### Root Causes Found

1. **Excessive hook initialization on Ventas page**: The `Ventas.tsx` component eagerly initializes ~12 hooks (campaigns, sales tracking, setter appointments, daily reports, story tracker, products, etc.) even for Speak Up, which only uses a subset (`SalesGoalBar`, `SpeakUpSalesSummary`, `RecentSalesTicker`, `SpeakUpAnalytics`, `SalesByProductChart`). The unused hooks still fire network requests.

2. **`useSalesTracking` called twice**: Lines 129 and 131 call `useSalesTracking` with different parameters -- one for summary KPIs and one for chart data. Both fire separate DB queries.

3. **`useSpeakUpAnalytics` fetches ALL sales from 6 months + ALL collections**: This is a large query that runs even before the page renders visible content.

4. **`useStories` pagination loop for archived stories**: Even though `stories_section: false` for Speak Up, if `useStories` is called from `StoryStoreSales` or `StoryRevenueTracker` on other client views, the archived stories pagination loop (`while(true)`) can be slow on large datasets. This isn't directly Speak Up's issue, but the Ventas page conditionally renders these for Alma Bendita while still initializing hooks for all clients.

5. **Meta campaigns query fires regardless**: `useCampaigns` runs for all clients with an ad account. Speak Up has an ad account (`act_1987139365503968`), so this query fires even though campaigns drilldown isn't shown for Speak Up.

6. **Dashboard page also eager**: Similarly loads `useContentData`, `useContentMetadata`, `useSocialFollowers`, `useCrosspostLinks`, `useYouTubeVideos` all at once, even with content/youtube disabled.

### Plan

**Step 1 - Lazy-load hooks on Ventas page**
- Wrap client-specific hooks with conditional `enabled` flags:
  - `useCampaigns`: only when `hasAdAccount && !isSpkUp`
  - `useDailyStoryTracker`: only when `isAlmaBendita`  
  - `useSetterDailyReports`: only when `isMindCoach || isHildaLopez`
  - `useSetterAppointments`: only when `flags.setter_tracker && !isSpkUp`
  - Second `useSalesTracking` (chart): pass `enabled: false` when period hasn't changed or data isn't needed

**Step 2 - Lazy-load hooks on Dashboard page**
- Pass `enabled: false` to hooks when their widget is hidden by feature flags:
  - `useContentData` / `useContentMetadata`: only when `showContentGrid || showInstagramPosts`
  - `useYouTubeVideos`: only when `showYouTubeVideos`
  - `useCrosspostLinks`: only when `showContentGrid`

**Step 3 - Optimize SpeakUpAnalytics query**
- Add date range filter to the sales query in `useSpeakUpAnalytics` (currently fetches 6 months of data on mount)
- Consider caching the collections query more aggressively

**Step 4 - Conditional campaign loading for Speak Up**
- Skip `useCampaigns` for Speak Up since they don't display campaign data on their ventas page

### Technical Details

Files to edit:
- `src/pages/Ventas.tsx` -- add conditional `enabled` to hooks
- `src/pages/Dashboard.tsx` -- add conditional `enabled` to hooks  
- `src/hooks/use-sales-tracking.ts` -- accept optional `enabled` param
- `src/hooks/use-content-data.ts` -- accept optional `enabled` param
- `src/hooks/use-youtube-videos.ts` -- accept optional `enabled` param
- `src/hooks/use-crosspost-links.ts` -- accept optional `enabled` param

This should significantly reduce the number of simultaneous API calls from ~15+ down to ~5-6 for Speak Up, making the page load much faster.

