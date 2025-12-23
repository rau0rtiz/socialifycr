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
  type?: string; // reel, video, post, carousel, short
  thumbnailUrl?: string;
  duration?: number;
}

interface CrossPostGroup {
  groupId: string;
  posts: string[];
  platforms: string[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// Check if two dates are within 3 hours of each other
function isWithin3Hours(date1: string, date2: string): boolean {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  const diffMs = Math.abs(d1 - d2);
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 3;
}

// Normalize content type for comparison
function normalizeType(type: string | undefined, platform: string): string {
  if (!type) return 'unknown';
  
  const t = type.toLowerCase();
  
  // Video formats across platforms
  if (t === 'reel' || t === 'short' || t === 'video') {
    return 'video';
  }
  
  // Image/post formats
  if (t === 'post' || t === 'image' || t === 'photo') {
    return 'image';
  }
  
  // Carousel/album formats
  if (t === 'carousel' || t === 'album' || t === 'carousel_album') {
    return 'carousel';
  }
  
  return t;
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

    console.log(`Analyzing ${content.length} posts for cross-post detection`);

    const groups: CrossPostGroup[] = [];
    const processedIds = new Set<string>();

    // Group content by platform for comparison
    const contentByPlatform: Record<string, ContentItem[]> = {};
    for (const item of content) {
      if (!contentByPlatform[item.platform]) {
        contentByPlatform[item.platform] = [];
      }
      contentByPlatform[item.platform].push(item);
    }

    const platforms = Object.keys(contentByPlatform);
    console.log(`Platforms found: ${platforms.join(', ')}`);

    // Compare content across different platforms
    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platform1 = platforms[i];
        const platform2 = platforms[j];
        
        const content1 = contentByPlatform[platform1];
        const content2 = contentByPlatform[platform2];

        for (const item1 of content1) {
          if (processedIds.has(item1.id)) continue;
          
          const type1 = normalizeType(item1.type, platform1);

          for (const item2 of content2) {
            if (processedIds.has(item2.id)) continue;
            
            const type2 = normalizeType(item2.type, platform2);

            // Check if within 3 hours AND same format type
            const withinTimeWindow = isWithin3Hours(item1.date, item2.date);
            const sameFormat = type1 === type2 && type1 !== 'unknown';

            if (withinTimeWindow && sameFormat) {
              const timeDiffMinutes = Math.abs(new Date(item1.date).getTime() - new Date(item2.date).getTime()) / (1000 * 60);
              
              console.log(`Match found: ${item1.id} (${platform1}, ${type1}) <-> ${item2.id} (${platform2}, ${type2}) - ${timeDiffMinutes.toFixed(0)} min apart`);
              
              // Determine confidence based on time proximity
              let confidence: 'high' | 'medium' | 'low' = 'high';
              if (timeDiffMinutes <= 30) {
                confidence = 'high';
              } else if (timeDiffMinutes <= 90) {
                confidence = 'medium';
              } else {
                confidence = 'low';
              }

              groups.push({
                groupId: `crosspost_${Math.random().toString(36).substr(2, 9)}`,
                posts: [item1.id, item2.id],
                platforms: [platform1, platform2],
                confidence,
                reason: `Mismo formato (${type1}) publicado con ${timeDiffMinutes.toFixed(0)} minutos de diferencia`
              });

              processedIds.add(item1.id);
              processedIds.add(item2.id);
              break;
            }
          }
        }
      }
    }

    console.log(`Found ${groups.length} cross-post groups`);

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
