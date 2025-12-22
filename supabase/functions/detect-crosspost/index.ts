import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentItem {
  id: string;
  title: string;
  caption?: string;
  date: string;
  platform: string;
  thumbnailUrl?: string;
}

interface CrossPostGroup {
  groupId: string;
  posts: string[]; // Array of post IDs that are cross-posted
  platforms: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json() as { content: ContentItem[] };

    if (!content || content.length === 0) {
      return new Response(
        JSON.stringify({ groups: [], error: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      console.warn("PERPLEXITY_API_KEY not configured, skipping cross-post detection");
      return new Response(
        JSON.stringify({ groups: [], error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare content summaries for analysis
    const contentSummaries = content.slice(0, 50).map(item => ({
      id: item.id,
      platform: item.platform,
      title: (item.title || '').substring(0, 100),
      caption: (item.caption || '').substring(0, 200),
      date: item.date,
    }));

    const prompt = `Analyze these social media posts and identify which ones are likely the same content posted on multiple platforms (cross-posts). 

Look for:
- Similar or identical titles/captions
- Posts published within 24-48 hours of each other
- Same topic or content theme

Content to analyze:
${JSON.stringify(contentSummaries, null, 2)}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "groups": [
    {
      "groupId": "unique_group_id",
      "postIds": ["id1", "id2"],
      "confidence": "high" | "medium" | "low",
      "reason": "brief reason why these are likely cross-posts"
    }
  ]
}

If no cross-posts are detected, return: {"groups": []}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are an expert at analyzing social media content to detect cross-posted content across platforms. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ groups: [], error: "API request failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "{}";
    
    // Parse the JSON response
    let parsedResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = { groups: [] };
      }
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      parsedResult = { groups: [] };
    }

    // Transform to CrossPostGroup format
    const groups: CrossPostGroup[] = (parsedResult.groups || []).map((group: any) => {
      const postIds = group.postIds || [];
      const platforms = postIds.map((id: string) => {
        const post = content.find(c => c.id === id);
        return post?.platform || 'unknown';
      }).filter((p: string, i: number, arr: string[]) => arr.indexOf(p) === i);

      return {
        groupId: group.groupId || `group_${Math.random().toString(36).substr(2, 9)}`,
        posts: postIds,
        platforms,
      };
    });

    return new Response(
      JSON.stringify({ groups }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-crosspost function:", error);
    return new Response(
      JSON.stringify({ groups: [], error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
