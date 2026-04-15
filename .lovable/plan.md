

## Plan: Update Calendly URL

Update the Calendly link to `https://calendly.com/raul-socialifycr/sesion-gratuita-de-planificacion` in two places:

### Changes

1. **`src/pages/Funnel.tsx`** — Update the `CALENDLY_URL` constant (line 9) from `https://calendly.com/socialifycr` to the new URL.

2. **`supabase/functions/send-funnel-result/index.ts`** — Update the `calendlyUrl` variable (line 107) from `https://calendly.com/socialifycr/estrategia` to the new URL. This ensures the CTA button in the funnel result email also points to the correct scheduling page.

Both changes are single-line string replacements.

