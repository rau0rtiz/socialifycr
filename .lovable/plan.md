

The user wants to schedule emails from the Comunicaciones tool. Let me look at the existing campaign structure to understand what they have.

Looking at the codebase:
- `email_campaigns` table exists with `status` field, used by `send-campaign` edge function
- There's a `SendCampaignDialog.tsx` component
- Currently campaigns are sent immediately

Plan: Add scheduling capability — pick a future date/time, save as `scheduled`, and a cron job dispatches them when due.

Keep concise.

