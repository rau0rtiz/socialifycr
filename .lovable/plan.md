

## Plan: Sync Sales to Client Database for Non-Speak Up Clients

### Problem
The Client Database page for non-Speak Up clients (like The Mind Coach) only reads from `setter_appointments`. When a sale is registered directly through the sales wizard — without an associated setter appointment — the customer never appears in the Client Database.

### Solution
Update the Client Database page (`src/pages/ClientDatabase.tsx`) to also pull contacts from `message_sales` and merge them with `setter_appointments` data into a unified view.

### Changes

**1. Update `src/pages/ClientDatabase.tsx`**

- Add a second query that fetches distinct customers from `message_sales` for the active client (fields: `customer_name`, `customer_phone`, `ad_campaign_name`, `source`, `sale_date`, `amount`, `currency`, `closer_name`, `status`, `product`)
- Merge both data sources into a single list:
  - Group by `customer_name` (case-insensitive) to avoid duplicates when a sale is linked to an appointment
  - For contacts that exist in both sources, prefer the appointment record but enrich it with sale amount data
  - For contacts that only exist in `message_sales`, create a lead-like record with status mapped from sale status (`completed` → `sold`, `pending` → `scheduled`)
- Add a "Ventas" column showing total purchase count/amount for each contact
- Ensure the search filter also covers these merged records

### Technical details
- The merge happens client-side using a `useMemo` that deduplicates by name
- Sales without `customer_name` are excluded (they have no useful contact info)
- No database changes needed — this is purely a frontend query + merge change

