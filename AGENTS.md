# Project Rules

- Dialogs and overlays mounted through a React portal (outside `.agency-shell` / `.noeval-scope`) must not rely on scoped theme classes; give them their own token block in `index.css` (see `.socialify-clapper`). Why: portal output escapes the scope selector, so those color utilities silently stop applying.
- Documentation-to-production import asks AI only for source-line ranges and classifications; server code copies original text, never AI-authored prose. Why: avoids rewriting and minimizes output tokens while keeping unlabelled source details.
- Publication calendar items (`content_calendar_items`) are upserted by `shot_id` from `clickup-create-tasks`; the client-facing `/calendario/:token` reads and writes only through the `calendar-public` edge function. Why: tables stay agency-only under RLS while the shared link needs no login.
- Calendar videos are stored as links (Drive/Milanote), never uploaded. Why: the agency already pays for that storage and video files are too heavy for the app.
- Calendar monthly scheduling targets live in agency-only `content_calendar_goals`, uniquely keyed by client and month; pace compares dates scheduled up to today with proportional elapsed-month coverage, not actual publication. Why: keep delivery planning separate from legacy platform analytics goals and avoid claiming pieces were published.
