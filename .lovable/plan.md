

## Plan: Funnel UX Overhaul + Agency Lead Database

### Problem 1: Insert button broken
The `.select('id').single()` after the insert fails because anonymous users don't have SELECT permission on `funnel_leads`. The insert succeeds but the select-back fails, triggering the error toast.

**Fix:** Remove `.select('id').single()` from the insert. Generate the ID client-side with `crypto.randomUUID()` and use it directly.

### Problem 2: New UX flow — blurred results + contact form
Instead of the current flow (questions → email capture → results), change to:
- Questions → show results BLURRED with contact form overlaid below
- On submit → reveal results, save to DB

**Changes:**
- **`src/pages/Funnel.tsx`**: After question 6, calculate the level immediately and go to step 7 which now shows blurred results + contact form together. Remove step 8 as separate.
- **`src/components/funnel/ResultsStep.tsx`**: Add a `blurred` prop. When blurred, apply CSS blur filter over the level card/meter and show the contact form (name + email only, no phone) below. On submit, save to DB, reveal results.
- **`src/components/funnel/EmailCaptureStep.tsx`**: Remove phone field. This component gets merged into ResultsStep.

### Problem 3: Remove phone field
- Remove phone from `EmailCaptureStep` and `contactInfo` state in Funnel.tsx
- Keep the DB column (nullable) but stop sending it

### Problem 4: Email with PDF (deferred)
Sending the PDF via email requires email infrastructure setup. We'll note this for a follow-up — for now the download button works on the results page.

### Problem 5: Agency Lead Database in Gestión
Create a new page `/agency-leads` in the Gestión sidebar section that shows a table of all `funnel_leads` with:
- Search by name/email
- Filter by level, industry
- Date column
- View answers in expandable detail
- Export capability
- Link to Calendly status

**Files to create/modify:**

1. **`src/pages/Funnel.tsx`**
   - Generate UUID client-side, remove `.select('id').single()`
   - Remove phone from state
   - After question 6, calculate level → go to step 7 (combined results+form)
   - Reduce to 7 steps total (0=welcome, 1-6=questions, 7=results with form)

2. **`src/components/funnel/ResultsStep.tsx`**
   - Add `blurred` state (starts true)
   - Add inline contact form (name + email) when blurred
   - On submit: insert to DB, set blurred=false
   - Props: `level`, `name`/`email` state managed internally, `onSubmit` callback, `onCalendlyClick`

3. **`src/components/funnel/EmailCaptureStep.tsx`**
   - Remove (no longer needed as separate step)

4. **`src/pages/AgencyLeads.tsx`** (new)
   - Table of funnel_leads with search, filters, detail view
   - Uses DashboardLayout
   - Protected route (admin/owner only)

5. **`src/components/dashboard/Sidebar.tsx`**
   - Add "Leads Funnel" or rename existing entry to point to `/agency-leads` for the internal DB view
   - Keep `/funnel` as the public-facing quiz

6. **`src/App.tsx`**
   - Add route for `/agency-leads`

7. **DB migration**: Add RLS SELECT policy for `anon` on `funnel_leads` — actually not needed. We'll just generate UUID client-side.

### Technical details
- Client-side UUID avoids the SELECT-after-INSERT RLS issue
- Blur effect: `filter: blur(8px)` CSS + `pointer-events: none` on the results section
- Contact form embedded directly in the results page below the blurred content
- The agency leads page queries `funnel_leads` (admin-only SELECT policy already exists)
