

## Lead Generation Quiz Funnel — Plan

### Concept

A public-facing multi-step quiz inspired by Hormozi's business levels framework. Visitors answer questions about their business, get classified into a level (1-6), receive a downloadable PDF strategy template, and — if they qualify — get offered a free planning session via Calendly/Cal.com.

### Business Levels Framework (6 levels)

| Level | Name | Revenue Range | Description |
|-------|------|---------------|-------------|
| 1 | Idea Stage | $0 | Has an idea but hasn't launched |
| 2 | Startup | $0 - $3K/mo | Launched, getting first clients |
| 3 | Growing | $3K - $15K/mo | Consistent revenue, building systems |
| 4 | Scaling | $15K - $50K/mo | Team in place, needs optimization |
| 5 | Established | $50K - $200K/mo | Solid systems, ready to multiply |
| 6 | Empire | $200K+/mo | Multi-channel, expansion mode |

Levels 3-5 qualify for the free session offer. Levels 1-2 get the PDF only. Level 6 gets a "premium consultation" CTA instead.

### Quiz Flow (5-6 steps)

1. **Welcome** — Headline + CTA to start
2. **About your business** — Industry, time in business, team size
3. **Revenue & clients** — Monthly revenue range, client acquisition method
4. **Biggest challenge** — Select from common pain points
5. **Email capture** — Name + email + phone (optional) to unlock results
6. **Results page** — Shows their level, delivers PDF download, and conditionally shows Calendly booking CTA

### Database

New table: `funnel_leads` (public insert, no auth required)
- `id`, `email`, `name`, `phone`, `business_level` (1-6), `industry`, `revenue_range`, `team_size`, `challenge`, `answers` (jsonb for all raw answers), `calendly_clicked` (boolean), `created_at`
- RLS: public INSERT (anon), admin-only SELECT

### Files to Create/Edit

1. **`src/pages/Funnel.tsx`** — Public page with the multi-step quiz UI
2. **`src/components/funnel/`** — Step components (WelcomeStep, BusinessInfoStep, RevenueStep, ChallengeStep, EmailCaptureStep, ResultsStep)
3. **`src/App.tsx`** — Add `/funnel` route (public, no ProtectedRoute)
4. **`src/components/dashboard/Sidebar.tsx`** — Add "Lead Funnel" link in the management section (agency-only)
5. **Database migration** — Create `funnel_leads` table

### UI/UX Notes

- Modern, clean design with progress bar
- Mobile-first (this is where ad traffic lands)
- Animations between steps (slide transitions)
- Socialify branding on the funnel page
- Results page shows a visual "level meter" with their position highlighted
- PDF download button (placeholder link for now, you'll upload real PDFs later)
- Calendly embed or redirect for qualified leads (you'll provide the link)

### Technical Details

- No authentication required for the funnel — it's fully public
- Email is saved to `funnel_leads` table with anon insert policy
- The quiz logic maps answers to a business level score on the client side
- The Sidebar gets a link to `/funnel` so you can preview it from the dashboard
- Placeholder PDF URLs per level — you'll replace them with real files later

