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
  duration?: number; // Duration in seconds
}

interface CrossPostGroup {
  groupId: string;
  posts: string[];
  platforms: string[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// Parse ISO 8601 duration (PT1M30S) to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  // If it's already a number, return it
  if (typeof duration === 'number') return duration;
  
  // Handle ISO 8601 duration format (e.g., PT1M30S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  // Try parsing as plain number
  const parsed = parseInt(duration, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// Check if two dates are within 24 hours of each other
function isWithin24Hours(date1: string, date2: string): boolean {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  const diffMs = Math.abs(d1 - d2);
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 24;
}

// Check if two durations are similar (within tolerance)
function isSimilarDuration(duration1: number, duration2: number, toleranceSeconds: number = 3): boolean {
  if (duration1 === 0 || duration2 === 0) return false;
  return Math.abs(duration1 - duration2) <= toleranceSeconds;
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
          
          const duration1 = parseDuration(item1.duration?.toString() || '0');

          for (const item2 of content2) {
            if (processedIds.has(item2.id)) continue;
            
            const duration2 = parseDuration(item2.duration?.toString() || '0');

            // Check if within 24 hours AND similar duration
            const withinTimeWindow = isWithin24Hours(item1.date, item2.date);
            const similarDuration = isSimilarDuration(duration1, duration2);

            if (withinTimeWindow && similarDuration) {
              console.log(`Match found: ${item1.id} (${platform1}, ${duration1}s) <-> ${item2.id} (${platform2}, ${duration2}s)`);
              
              // Determine confidence based on how close the match is
              let confidence: 'high' | 'medium' | 'low' = 'high';
              const durationDiff = Math.abs(duration1 - duration2);
              const timeDiffHours = Math.abs(new Date(item1.date).getTime() - new Date(item2.date).getTime()) / (1000 * 60 * 60);
              
              if (durationDiff === 0 && timeDiffHours <= 6) {
                confidence = 'high';
              } else if (durationDiff <= 1 && timeDiffHours <= 12) {
                confidence = 'high';
              } else if (durationDiff <= 2) {
                confidence = 'medium';
              } else {
                confidence = 'low';
              }

              groups.push({
                groupId: `crosspost_${Math.random().toString(36).substr(2, 9)}`,
                posts: [item1.id, item2.id],
                platforms: [platform1, platform2],
                confidence,
                reason: `Duración similar (${duration1}s vs ${duration2}s) y publicados con ${timeDiffHours.toFixed(1)}h de diferencia`
              });

              processedIds.add(item1.id);
              processedIds.add(item2.id);
              break; // Move to next item1
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
