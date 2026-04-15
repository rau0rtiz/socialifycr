

## Plan: 3 Changes — Background Icons, Archivos Section, Funnel Email Template

### 1. Background icons: all orange, varied blur and opacity

**File:** `src/pages/Funnel.tsx` (lines 239-248)

Replace the 8 SVG icons so they are all `#FF6B35` (orange) with varying opacities (`0.03` to `0.08`) and CSS `blur()` filters (`blur(1px)` to `blur(4px)`) to create depth layers. Some icons appear sharper and more visible (foreground feel), others are very blurred and faint (background feel). Remove the current multi-color scheme.

### 2. New "Archivos" section in sidebar under Gestión

Consolidate Image DB and a new document manager into a single "Archivos" page with tabs.

**Changes:**
- **`src/pages/Archivos.tsx`** — New page with two tabs:
  - **Imágenes** — Embeds the existing `ImageDBContent` component (extracted from `ImageDB.tsx`)
  - **Documentos** — New file manager for PDFs and documents stored in a `documents` folder inside the `content-images` bucket (or a new `documents` bucket). Lists uploaded files with download/delete actions and an upload button.
- **`src/components/dashboard/Sidebar.tsx`** — Replace `Image DB` entry in `managementMenuItems` with `{ title: 'Archivos', url: '/archivos', icon: FolderOpen }`
- **`src/App.tsx`** — Add route `/archivos` (protected, agency-only). Keep `/image-db` and `/imgdb` routes working for backward compatibility.

### 3. Funnel roadmap email template

Create a new email template in the `email_templates` DB table (via the existing template system) specifically for sending the roadmap PDF results to funnel leads.

**Changes:**
- **`src/components/funnel/ResultsStep.tsx`** — After successful contact submission (`handleSubmit` → `onSubmitContact` returns true), call `supabase.functions.invoke('send-campaign-single', ...)` or use the existing Resend-based edge function to send the roadmap email.
- **`supabase/functions/send-funnel-result/index.ts`** — New edge function that:
  1. Receives `{ lead_id, name, email, business_level }`
  2. Fetches the `funnel-result` template from `email_templates`
  3. Replaces `{{name}}`, `{{level_name}}`, `{{level_desc}}` variables
  4. Sends via Resend
  5. Logs to `sent_emails`
- **Seed the template** — A migration to insert the `funnel-result` system template into `email_templates` with branded HTML (Socialify orange `#FF6B35`, level name, description, and CTA to book Calendly session). Variables: `name`, `level_name`, `level_desc`, `calendly_url`.

### Technical details

- Background SVGs use inline `style={{ filter: 'blur(Xpx)' }}` — no extra CSS needed, zero performance impact
- The Archivos page reuses the existing `ImageDBContent` component for images tab
- Documents tab uses `supabase.storage` to list/upload/delete from `content-images/documents/` path
- The funnel email edge function uses `verify_jwt: false` since it's called from a public page (no auth)
- Template HTML follows the existing email template pattern with Handlebars `{{variables}}`

