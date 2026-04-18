

User wants a mini-branch in the funnel for people who **tried ads/pauta** but **abandoned it**. They want to capture:
1. A **range** (presumably how much they spent / for how long)
2. The **reason** they gave up

This is for the public lead-gen funnel at `/funnel`. Let me check the funnel structure to understand where this branch fits.

Looking at memory: the funnel is a 6-level business quiz. Files: `WelcomeStep`, `BusinessInfoStep`, `RevenueStep`, `ChallengeStep`, `FunnelQuestion`, `ResultsStep`.

I need to read these to understand the flow and where to inject the branch. Let me check.

The user says "redimir puntos jajaja" — joking, just means they want to gather valuable insight for these warm leads. Not a real loyalty system.

Plan: keep it small. Add a conditional branch triggered when the user picks a specific answer in `ChallengeStep` (e.g., "Probé pauta y no funcionó" or similar). Then 2 quick questions:
- Cuánto invertiste / por cuánto tiempo (rangos)
- Por qué lo dejaste (opciones + "otro")

Save in `funnel_leads.answers` JSONB (already exists) — no schema change needed. Show a tiny acknowledgment in `ResultsStep` if they fall in this branch ("Vimos que probaste pauta — incluiremos recomendaciones específicas en tu diagnóstico").

Let me look at ChallengeStep and Funnel.tsx briefly to be precise.

