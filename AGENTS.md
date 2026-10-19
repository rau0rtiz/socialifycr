# Project Rules

- Dialogs and overlays mounted through a React portal (outside `.agency-shell` / `.noeval-scope`) must not rely on scoped theme classes; give them their own token block in `index.css` (see `.socialify-clapper`). Why: portal output escapes the scope selector, so those color utilities silently stop applying.
- Documentation-to-production import asks AI only for source-line ranges and classifications; server code copies original text, never AI-authored prose. Why: avoids rewriting and minimizes output tokens while keeping unlabelled source details.
