

## Plan: Email Template Manager + Marketing Tool

### What we're building

A full email template system inside the "Comunicaciones" section that lets you:
1. View and edit all existing notification email templates (invitations, avatar reminders, notifications)
2. Create new custom templates with a visual HTML editor
3. Select audiences (funnel leads, email contacts, team members) and send campaigns using any template
4. A new "Plantillas" tab in Comunicaciones for managing everything

### Database changes

**New table: `email_templates`**
- `id`, `name`, `slug` (unique identifier like `invitation`, `avatar-reminder`), `subject`, `html_content`, `description`, `category` (system | custom), `variables` (jsonb — lists available merge tags like `{{name}}`, `{{link}}`), `status` (active/draft), `created_at`, `updated_at`
- RLS: admins can CRUD, authenticated can SELECT
- Seed with 3 system templates extracted from the current hardcoded HTML in edge functions:
  - `invitation` — from `send-client-invitation`
  - `avatar-reminder` — from `send-avatar-reminder`
  - `notification` — from `send-notification-email`

### Frontend changes

**1. New tab "Plantillas" in `Comunicaciones.tsx`**
- Added between "Emails" and "Funnels"

**2. New component `src/components/comunicaciones/EmailTemplatesContent.tsx`**
- Grid of template cards showing name, category badge (Sistema/Custom), description, preview thumbnail
- Click to open editor dialog
- "Crear Plantilla" button for new custom templates

**3. Template Editor Dialog**
- Fields: Name, Subject, Category (read-only for system), Description
- Split view: HTML code editor (left) + live preview iframe (right)
- Available variables listed as clickable chips that insert into the editor
- Save updates the `email_templates` table
- System templates show a warning that changes affect all future sends of that type

**4. "Enviar Campaña" flow from templates**
- Button on each template card to "Use as campaign"
- Opens audience selector:
  - Funnel leads (from specific funnel, filterable by level)
  - Email contacts (from specific client, filterable by tags)
  - Team members (all users without avatar, etc.)
- Preview with recipient count → confirm → sends via existing `send-campaign` or `send-notification-email` edge functions

**5. Update edge functions to use DB templates**
- Modify `send-client-invitation`, `send-avatar-reminder`, and `send-notification-email` to fetch HTML from `email_templates` table by slug instead of hardcoding
- Fallback to hardcoded HTML if template not found (backward safety)

### Technical details
- Templates use Handlebars-style `{{variable}}` placeholders, same pattern already used in `send-campaign`
- System templates are protected from deletion but editable
- The live preview renders the HTML in a sandboxed iframe
- Edge functions query `email_templates` via service role client at send time

### Result
One central place to manage all email designs, create new ones, and use them for both system notifications and marketing campaigns to funnel leads.

