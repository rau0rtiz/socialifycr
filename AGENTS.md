# Project Rules

- Dialogs and overlays mounted through a React portal (outside `.agency-shell` / `.noeval-scope`) must not rely on scoped theme classes; give them their own token block in `index.css` (see `.socialify-clapper`). Why: portal output escapes the scope selector, so those color utilities silently stop applying.
