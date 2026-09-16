// Global kill switch for AI features (OCR, insights, reports).
// Rows live in public.ai_switches and are toggled from the agency dashboard.
export type AiFeature = "ocr" | "insights" | "reports" | "production_ai";

export async function aiFeatureEnabled(feature: AiFeature): Promise<boolean> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return true;

    const res = await fetch(
      `${url}/rest/v1/ai_switches?feature=eq.${feature}&select=enabled`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return true;
    const rows = (await res.json()) as { enabled: boolean }[];
    if (!Array.isArray(rows) || rows.length === 0) return true;
    return rows[0].enabled !== false;
  } catch (_err) {
    // Fail open so a transient error never breaks a feature silently.
    return true;
  }
}

export function aiDisabledResponse(headers: Record<string, string>) {
  return new Response(
    JSON.stringify({
      disabled: true,
      error:
        "Esta función de IA está apagada para no consumir créditos. Activala en Agencia → Resumen → Consumo de IA.",
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
  );
}
