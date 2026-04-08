import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an OCR assistant that extracts sales-related information from Instagram story images.
Extract any visible text that could be: customer name, phone number, brand/product name, price/amount, or any other sale-related info.
Use the provided tool to return structured data. If a field is not found, set it to null.
Focus on text overlays, captions, and any written content visible in the image.
Amounts should be numbers only (no currency symbols). Phone numbers should include only digits and dashes.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract any sales-related text from this Instagram story image:" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_story_data",
              description: "Extract structured sales data from the story image text",
              parameters: {
                type: "object",
                properties: {
                  customer_name: { type: "string", description: "Customer name if visible", nullable: true },
                  customer_phone: { type: "string", description: "Phone number if visible", nullable: true },
                  brand: { type: "string", description: "Brand or product name if visible", nullable: true },
                  amount: { type: "number", description: "Price or amount if visible (number only)", nullable: true },
                  notes: { type: "string", description: "Any other relevant text from the image", nullable: true },
                },
                required: ["customer_name", "customer_phone", "brand", "amount", "notes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_story_data" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI scan failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let scannedData = null;

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const hasValue = Object.values(parsed).some((v) => v !== null && v !== undefined && v !== "");
      scannedData = hasValue ? parsed : null;
    }

    return new Response(JSON.stringify({ scannedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-story-text error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
