

## Plan: Email Open Tracking

Yes, it can be implemented. The approach uses a **tracking pixel** — a tiny invisible image embedded in each email. When the recipient opens the email, the image loads from a new Edge Function that records the open event.

### How it works

1. Each email gets a unique tracking pixel URL: `<img src="https://.../functions/v1/track-email-open?id=EMAIL_ID" width="1" height="1" />`
2. When the recipient opens the email, the image request hits the Edge Function
3. The function records the timestamp in the database and returns a 1x1 transparent GIF

### Changes

**1. Database migration** — Add `opened_at` column to `sent_emails`:
```sql
ALTER TABLE sent_emails ADD COLUMN opened_at timestamptz DEFAULT NULL;
```

**2. New Edge Function `track-email-open`** — Receives the email ID via query param, updates `opened_at` if not already set, returns a 1x1 transparent GIF. No auth required (called by email clients).

**3. Update all email-sending Edge Functions** — Inject the tracking pixel into the HTML before sending. Affects:
- `send-notification-email`
- `send-funnel-result`
- `send-campaign`
- `send-password-reset`
- `send-avatar-reminder`
- `send-client-invitation`

Each function appends an `<img>` tag with the `sent_emails` record ID to the HTML body.

**4. Update `EmailsLogContent.tsx`** — Show an open indicator (eye icon or badge) next to each email in the history list, displaying the open timestamp when available.

### Limitations (important to know)
- Open tracking is not 100% accurate: some email clients block images by default (e.g., Outlook), so not every open will be recorded
- Privacy-focused clients like Apple Mail may pre-fetch images, registering a false "open"
- It gives a good general indication but should not be taken as exact

