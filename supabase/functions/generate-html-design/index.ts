import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un diseñador visual experto que genera código HTML+CSS puro para crear visualizaciones llamativas optimizadas para redes sociales.

REGLAS:
- Devuelve SOLO el código HTML completo (con <!DOCTYPE html>, <html>, <head>, <body>).
- Usa CSS inline o en un <style> tag dentro del <head>.
- El diseño debe ser visualmente impactante, profesional y moderno.
- Usa gradientes, sombras, tipografías de Google Fonts cuando sea apropiado.
- El viewport debe ser exactamente 1080x1080px (cuadrado para Instagram) a menos que se indique otro formato.
- Agrega un meta viewport fijo: <meta name="viewport" content="width=1080">
- NO uses JavaScript ni librerías externas excepto Google Fonts.
- El fondo nunca debe ser blanco puro, usa colores con personalidad.
- Usa emojis cuando aporten al diseño.
- Todo el texto debe ser en español a menos que se indique lo contrario.
- Si el usuario pide un formato específico (story 1080x1920, post 1080x1080, landscape 1920x1080), ajusta el viewport.

FORMATOS DISPONIBLES:
- Post cuadrado: 1080x1080
- Story vertical: 1080x1920
- Landscape: 1920x1080
- Carrusel slide: 1080x1350`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, format } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formatHint = format ? `\n\nFORMATO SOLICITADO: ${format}` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt + formatHint },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intentá de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Extract HTML from markdown code blocks if present
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      content = htmlMatch[1].trim();
    } else {
      // Try generic code block
      const codeMatch = content.match(/```\s*([\s\S]*?)```/);
      if (codeMatch && codeMatch[1].includes("<!DOCTYPE")) {
        content = codeMatch[1].trim();
      }
    }

    return new Response(
      JSON.stringify({ html: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-html-design error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
