

## Plan: Side-by-side code editor and preview in template dialog

### What changes

Restructure the HTML editor section in `EmailTemplateEditorDialog.tsx` so the code editor and live preview display **side by side** instead of toggling between tabs. This uses more vertical space and lets the user see changes in real time.

### Changes (single file: `EmailTemplateEditorDialog.tsx`)

1. **Remove the code/preview toggle buttons** — both panels are always visible
2. **Replace the toggle section (lines ~175-210)** with a two-column grid layout:
   - Left column: HTML code textarea (with "Código" label)
   - Right column: sandboxed iframe preview (with "Vista previa" label)
   - Layout: `grid grid-cols-2 gap-4` with both panels having `min-h-[400px]`
3. **Widen the dialog** — change `max-w-4xl` to `max-w-6xl` to accommodate two panels comfortably
4. **Remove `viewMode` state** since it's no longer needed

### Result
Code and preview always visible side by side, giving a real-time editing experience with better vertical space usage.

