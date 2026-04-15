

## Plan: Conditional CTA by Level in Roadmap Results

### Summary
Hide the session CTA for levels 1-3, keep it for levels 4-5, and change the copy for level 6 to an "exploratory session" instead of a free planning session.

### Changes

**File: `src/components/funnel/ResultsStep.tsx`**

1. **Levels 1-3**: No session CTA shown at all after reveal — only the email confirmation box appears.

2. **Levels 4-5**: Keep the current CTA as-is:
   - Title: "¿Querés ayuda para implementarlo?"
   - Description: "Agendá una sesión gratuita de 1 hora donde definimos un plan concreto para tu negocio. **Lo ejecutés con nosotros o no, el plan es tuyo.**"
   - Button: "Agendar sesión gratuita"

3. **Level 6**: Different copy:
   - Title: "¿Querés llevar tu marca al siguiente nivel?"
   - Description: "Agendá una sesión exploratoria donde analizamos tu contexto y definimos un plan preliminar de trabajo. **Lo ejecutés con nosotros o no, el plan es tuyo.**"
   - Button: "Agendar sesión exploratoria"

4. Update the existing `qualifiesForSession` and `isPremium` variables to control which CTA variant renders (or hide it entirely for levels 1-3).

### Technical detail
- The `qualifiesForSession` const changes from `level >= 3` to `level >= 4`
- Conditional rendering: `level >= 4` shows the CTA block, with copy switching on `level === 6`

