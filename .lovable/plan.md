
User wants to send standalone emails without templates. The current `SendCampaignDialog` requires a template. Need to make it possible to compose a campaign from scratch with a rich editor or HTML editor, plus subject + recipients + send/schedule.

Plan: Add a "Nueva campaña" button at top of CampaignsContent that opens a dialog where you compose subject + content directly (with WYSIWYG or rich textarea), pick recipients, and send/schedule. Keep template-based sending as is.

Quick implementation:
1. Refactor SendCampaignDialog to make `template` optional. When null, show subject + content fields editable from scratch.
2. Add "Nueva campaña" button in CampaignsContent that opens it with template=null.
3. Use a simple rich-text-ish approach: a textarea with HTML support + live preview, OR use the existing email template editor's content area.

Actually the cleanest: extract a small composer. Let me look at SendCampaignDialog quickly.
