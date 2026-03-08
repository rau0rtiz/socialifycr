

## Plan: 3 Features for Socialify

### Feature 1: Onboarding Tour Interactivo (Priority 1)

A step-by-step guided tour for new users (especially invited client users) that highlights key areas of the dashboard.

**Approach:** Pure React component with no external library. Use a state machine to track steps, overlay highlights with CSS `box-shadow` trick, and a tooltip positioned near each target element.

**Steps:**
- Create a `src/components/onboarding/OnboardingTour.tsx` component with ~6 steps: sidebar navigation, client selector (agency) or dashboard KPIs (client), content tab, sales tab, profile button
- Each step targets a DOM element via `data-tour="step-name"` attributes
- Add `data-tour` attributes to Sidebar items, TopBar elements, and key dashboard sections
- Store tour completion in a `profiles` column (`onboarding_completed boolean default false`) via a migration
- Integrate the tour into `DashboardLayout.tsx` -- show on first login when `onboarding_completed` is false
- Different step sequences for agency vs client users (use `useUserRole`)

**Database:** Add `onboarding_completed` column to `profiles` table.

---

### Feature 2: Reportes Automáticos de Ventas Mensuales (Priority 2)

An Edge Function triggered by `pg_cron` on the 1st of each month that generates a sales summary for each client and emails it.

**Approach:**
- **Edge Function** `generate-monthly-sales-report`: Queries `message_sales` for the previous month per client, calculates totals (CRC/USD, by source, count), generates a formatted HTML email using AI (Lovable gateway) for a narrative summary, sends via existing `send-notification-email` pattern (Resend)
- **Cron job** via `pg_cron` + `pg_net`: Scheduled for `0 8 1 * *` (1st of month at 8 AM) calling the edge function
- **Recipients:** All team members of each client with `account_manager` or `editor` roles (query `client_team_members` + `profiles` for emails)
- **Config:** Add a `monthly_sales_report` boolean to `client_feature_flags` so it can be toggled per client

**Database:**
- Add `monthly_sales_report` boolean column to `client_feature_flags` (default false)
- Enable `pg_cron` and `pg_net` extensions
- Create the cron schedule via insert tool (not migration)

**Edge Function:** `supabase/functions/generate-monthly-sales-report/index.ts` with `verify_jwt = false` (cron-triggered).

---

### Feature 3: Panel de Historial de Acciones (Audit Log) (Priority 3)

A visual "Activity History" page accessible to agency admins from the sidebar.

**Approach:**
- New page `src/pages/Historial.tsx` with `DashboardLayout`
- Query `audit_logs` joined with `profiles` (for user names) ordered by `created_at desc`
- Display as a timeline/feed: each entry shows icon (based on action type), user avatar + name, action description in Spanish, entity name, relative timestamp
- Filters: by action type, by date range, by user
- Pagination (load 50 at a time, "load more" button)
- Add route `/historial` in `App.tsx` wrapped in `RoleProtectedRoute` (agency only)
- Add sidebar entry under "Gestion" section with `History` icon

**No database changes needed** -- `audit_logs` table and RLS already exist.

---

### Summary

| Feature | New Files | DB Changes | Edge Functions |
|---------|-----------|------------|----------------|
| Onboarding Tour | `OnboardingTour.tsx` | Add `onboarding_completed` to profiles | None |
| Sales Reports | None | Add `monthly_sales_report` to feature flags + cron | `generate-monthly-sales-report` |
| Audit Log Panel | `Historial.tsx` | None | None |

All three features also require minor edits to `App.tsx` (routes), `Sidebar.tsx` (nav items), `DashboardLayout.tsx` (tour integration), and `ClientFeatureFlags.tsx` (toggle).

