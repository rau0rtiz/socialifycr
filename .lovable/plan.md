

## Plan: Merge "Emails" and "Leads Funnel" into a single "Comunicaciones" section

### What changes

Combine the two separate management pages — **Emails** (`/emails-log`) and **Leads Funnel** (`/agency-leads`) — into a single tabbed page to reduce sidebar clutter.

### Changes

**1. Sidebar (`src/components/dashboard/Sidebar.tsx`)**
- Remove the two separate entries (`Emails` and `Leads Funnel`)
- Add one entry: `Comunicaciones` at `/comunicaciones` with the `Mail` icon

**2. New page `src/pages/Comunicaciones.tsx`**
- Tabbed layout with two tabs:
  - **Emails** — renders the existing EmailsLog content
  - **Leads Funnel** — renders the existing AgencyLeads content
- Uses `DashboardLayout` wrapper and `Tabs` component consistent with the rest of the app

**3. Refactor existing pages into embeddable components**
- Extract the inner content of `EmailsLog.tsx` (everything inside `<DashboardLayout>`) into a reusable component `EmailsLogContent`
- Extract the inner content of `AgencyLeads.tsx` into `AgencyLeadsContent`
- The original pages can remain as thin wrappers (or redirect to `/comunicaciones`) for backward compatibility

**4. Router (`src/App.tsx`)**
- Add route `/comunicaciones` pointing to the new page
- Optionally redirect `/emails-log` and `/agency-leads` to `/comunicaciones` (or keep them as aliases)

### Result
One sidebar item ("Comunicaciones") replaces two, with tabs to switch between Emails and Leads Funnel views.

