import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const { clientId, endpoint, params = {} } = await req.json();

    if (!clientId || !endpoint) {
      return new Response(JSON.stringify({ error: 'Missing clientId or endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase.rpc('has_client_access', { _client_id: clientId, _user_id: user.id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connection from database
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'meta')
      .eq('status', 'active')
      .maybeSingle();

    if (connectionError || !connection) {
      console.log('No active Meta connection for client:', clientId);
      return new Response(JSON.stringify({ connected: false, data: null, error: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userAccessToken = connection.access_token;
    const pageAccessToken = connection.refresh_token;

    // Use the page token for page/IG endpoints when available.
    // Use the user token for Ads Manager endpoints (campaigns/adsets/ads/insights).
    const accessToken = pageAccessToken || userAccessToken;

    const pageId = connection.platform_page_id;
    const instagramId = connection.instagram_account_id;

    const rawAdAccountId = connection.ad_account_id;
    const adAccountId = rawAdAccountId
      ? (rawAdAccountId.startsWith('act_') ? rawAdAccountId : `act_${rawAdAccountId}`)
      : null;

    console.log(`Fetching ${endpoint} for client ${clientId}`);

    let result;

    switch (endpoint) {
      case 'page-insights': {
        // Get page insights (reach, engagement, impressions)
        const period = params.period || 'day';
        const since = params.since || Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
        const until = params.until || Math.floor(Date.now() / 1000);
        
        const metrics = [
          'page_impressions',
          'page_impressions_unique',
          'page_engaged_users',
          'page_post_engagements',
          'page_fans',
          'page_fans_online_per_day'
        ].join(',');

        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/insights?` +
          `metric=${metrics}&period=${period}&since=${since}&until=${until}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'instagram-insights': {
        if (!instagramId) {
          return new Response(JSON.stringify({ error: 'No Instagram account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Instagram account insights
        const metrics = [
          'impressions',
          'reach',
          'profile_views',
          'follower_count'
        ].join(',');

        const period = params.period || 'day';
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${instagramId}/insights?` +
          `metric=${metrics}&period=${period}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'instagram-media': {
        if (!instagramId) {
          return new Response(JSON.stringify({ error: 'No Instagram account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get recent Instagram posts
        const limit = params.limit || 10;
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${instagramId}/media?` +
          `fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
          `&limit=${limit}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'page-posts': {
        // Get recent Facebook page posts
        const limit = params.limit || 10;
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/posts?` +
          `fields=id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)` +
          `&limit=${limit}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'ads-insights': {
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'No Ad account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get ads insights
        const datePreset = params.datePreset || 'last_30d';
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${adAccountId}/insights?` +
          `fields=impressions,reach,spend,cpc,cpm,clicks,actions` +
          `&date_preset=${datePreset}&access_token=${userAccessToken}`
        );
        result = await response.json();
        break;
      }

      case 'campaigns': {
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'No Ad account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build time range params - support custom date ranges
        let timeRangeParam = '';
        if (params.since && params.until) {
          timeRangeParam = `&time_range={"since":"${params.since}","until":"${params.until}"}`;
        } else {
          const datePreset = params.datePreset || 'last_30d';
          timeRangeParam = `&date_preset=${datePreset}`;
        }

        // Get ad account info for currency
        let currency = 'USD';
        try {
          const accountResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}?fields=currency&access_token=${userAccessToken}`
          );
          const accountData = await accountResponse.json();
          if (accountData.currency) {
            currency = accountData.currency;
          }
        } catch (err) {
          console.log('Could not fetch ad account currency:', err);
        }

        // Get campaigns first
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?` +
          `fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time` +
          `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
          `&limit=50&access_token=${userAccessToken}`
        );
        const campaignsData = await campaignsResponse.json();

        if (campaignsData.error) {
          console.error('Campaigns API error:', campaignsData.error);
          result = campaignsData;
          break;
        }

        // For each campaign, get insights
        const campaignsWithInsights = await Promise.all(
          (campaignsData.data || []).map(async (campaign: any) => {
            try {
              const insightsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${campaign.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type,purchase_roas` +
                `${timeRangeParam}&access_token=${userAccessToken}`
              );
              const insightsData = await insightsResponse.json();
              
              // Log actions for messaging campaigns to debug cost per result
              if (campaign.objective === 'MESSAGES' || campaign.name.toLowerCase().includes('mensaje')) {
                console.log(`Campaign ${campaign.name} (${campaign.objective}) actions:`, 
                  JSON.stringify(insightsData?.data?.[0]?.actions || []));
                console.log(`Campaign ${campaign.name} cost_per_action_type:`, 
                  JSON.stringify(insightsData?.data?.[0]?.cost_per_action_type || []));
              }
              
              return {
                ...campaign,
                insights: insightsData
              };
            } catch (err) {
              console.log(`Could not fetch insights for campaign ${campaign.id}:`, err);
              return { ...campaign, insights: null };
            }
          })
        );

        console.log('Successfully fetched campaigns');
        result = { data: campaignsWithInsights, currency };
        break;
      }

      case 'adsets': {
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'No Ad account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const campaignId = params.campaignId;
        if (!campaignId) {
          return new Response(JSON.stringify({ error: 'Missing campaignId parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build time range params - support custom date ranges
        let timeRangeParam = '';
        if (params.since && params.until) {
          timeRangeParam = `&time_range={"since":"${params.since}","until":"${params.until}"}`;
        } else {
          const datePreset = params.datePreset || 'last_30d';
          timeRangeParam = `&date_preset=${datePreset}`;
        }

        // Get ad account currency
        let currency = 'USD';
        try {
          const accountResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}?fields=currency&access_token=${userAccessToken}`
          );
          const accountData = await accountResponse.json();
          if (accountData.currency) {
            currency = accountData.currency;
          }
        } catch (err) {
          console.log('Could not fetch ad account currency:', err);
        }

        // Get ad sets for a specific campaign
        const adsetsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${campaignId}/adsets?` +
          `fields=id,name,status,effective_status,daily_budget,lifetime_budget,start_time,end_time,optimization_goal,billing_event` +
          `&limit=50&access_token=${userAccessToken}`
        );
        const adsetsData = await adsetsResponse.json();

        if (adsetsData.error) {
          console.error('AdSets API error:', adsetsData.error);
          result = adsetsData;
          break;
        }

        // For each adset, get insights
        const adsetsWithInsights = await Promise.all(
          (adsetsData.data || []).map(async (adset: any) => {
            try {
              const insightsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${adset.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type` +
                `${timeRangeParam}&access_token=${userAccessToken}`
              );
              const insightsData = await insightsResponse.json();
              return {
                ...adset,
                insights: insightsData
              };
            } catch (err) {
              console.log(`Could not fetch insights for adset ${adset.id}:`, err);
              return { ...adset, insights: null };
            }
          })
        );

        result = { data: adsetsWithInsights, currency };
        break;
      }

      case 'ads': {
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'No Ad account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const adsetId = params.adsetId;
        if (!adsetId) {
          return new Response(JSON.stringify({ error: 'Missing adsetId parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build time range params - support custom date ranges
        let timeRangeParam = '';
        if (params.since && params.until) {
          timeRangeParam = `&time_range={"since":"${params.since}","until":"${params.until}"}`;
        } else {
          const datePreset = params.datePreset || 'last_30d';
          timeRangeParam = `&date_preset=${datePreset}`;
        }

        // Get ad account currency
        let currency = 'USD';
        try {
          const accountResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}?fields=currency&access_token=${userAccessToken}`
          );
          const accountData = await accountResponse.json();
          if (accountData.currency) {
            currency = accountData.currency;
          }
        } catch (err) {
          console.log('Could not fetch ad account currency:', err);
        }

        // Get ads for a specific ad set with creative info
        const adsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${adsetId}/ads?` +
          `fields=id,name,status,effective_status,creative{id,name,thumbnail_url}` +
          `&limit=50&access_token=${userAccessToken}`
        );
        const adsData = await adsResponse.json();

        if (adsData.error) {
          console.error('Ads API error:', adsData.error);
          result = adsData;
          break;
        }

        // For each ad, get insights
        const adsWithInsights = await Promise.all(
          (adsData.data || []).map(async (ad: any) => {
            try {
              const insightsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${ad.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type` +
                `${timeRangeParam}&access_token=${userAccessToken}`
              );
              const insightsData = await insightsResponse.json();
              return {
                ...ad,
                insights: insightsData
              };
            } catch (err) {
              console.log(`Could not fetch insights for ad ${ad.id}:`, err);
              return { ...ad, insights: null };
            }
          })
        );

        result = { data: adsWithInsights, currency };
        break;
      }

      case 'all-ads': {
        // Get ALL ads across all active campaigns (flat list for linking to sales)
        if (!adAccountId) {
          return new Response(JSON.stringify({ error: 'No Ad account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build time range params
        let timeRangeParam = '';
        if (params.since && params.until) {
          timeRangeParam = `&time_range={"since":"${params.since}","until":"${params.until}"}`;
        } else {
          const datePreset = params.datePreset || 'last_30d';
          timeRangeParam = `&date_preset=${datePreset}`;
        }

        // Get ad account currency
        let allAdsCurrency = 'USD';
        try {
          const accountResponse = await fetch(
            `https://graph.facebook.com/v21.0/${adAccountId}?fields=currency&access_token=${userAccessToken}`
          );
          const accountData = await accountResponse.json();
          if (accountData.currency) {
            allAdsCurrency = accountData.currency;
          }
        } catch (err) {
          console.log('Could not fetch ad account currency:', err);
        }

        // Get all ads from ad account with active campaigns filter
        const allAdsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${adAccountId}/ads?` +
          `fields=id,name,status,effective_status,creative{id,name,thumbnail_url,image_url,object_story_spec},campaign{id,name}` +
          `&filtering=[{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}]` +
          `&limit=100&access_token=${userAccessToken}`
        );
        const allAdsData = await allAdsResponse.json();

        if (allAdsData.error) {
          console.error('All Ads API error:', allAdsData.error);
          result = allAdsData;
          break;
        }

        // For each ad, get insights
        const allAdsWithInsights = await Promise.all(
          (allAdsData.data || []).map(async (ad: any) => {
            try {
              const insightsResponse = await fetch(
                `https://graph.facebook.com/v21.0/${ad.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type` +
                `${timeRangeParam}&access_token=${userAccessToken}`
              );
              const insightsData = await insightsResponse.json();
              return {
                ...ad,
                insights: insightsData
              };
            } catch (err) {
              console.log(`Could not fetch insights for ad ${ad.id}:`, err);
              return { ...ad, insights: null };
            }
          })
        );

        result = { data: allAdsWithInsights, currency: allAdsCurrency };
        break;
      }

      case 'page-info': {
        // Get basic page and Instagram info
        const pageResponse = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}?` +
          `fields=id,name,fan_count,followers_count,picture,category&access_token=${accessToken}`
        );
        const pageData = await pageResponse.json();

        let instagramData = null;
        if (instagramId) {
          const igResponse = await fetch(
            `https://graph.facebook.com/v21.0/${instagramId}?` +
            `fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count` +
            `&access_token=${accessToken}`
          );
          instagramData = await igResponse.json();
        }

        result = { page: pageData, instagram: instagramData };
        break;
      }

      case 'instagram-media-with-insights': {
        if (!instagramId) {
          return new Response(JSON.stringify({ error: 'No Instagram account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Instagram media with pagination support for fetching all posts
        const targetLimit = params.limit || 6;
        const perPageLimit = Math.min(targetLimit, 50); // Instagram API max is ~100, use 50 for safety
        let allMedia: any[] = [];
        let nextCursor: string | null = null;
        let pagesProcessed = 0;
        const maxPages = Math.ceil(targetLimit / perPageLimit);

        console.log(`Fetching instagram-media-with-insights for client ${clientId}, target: ${targetLimit} posts`);

        // Fetch pages until we have enough posts or no more pages
        while (allMedia.length < targetLimit && pagesProcessed < maxPages) {
          let url = `https://graph.facebook.com/v21.0/${instagramId}/media?` +
            `fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
            `&limit=${perPageLimit}&access_token=${accessToken}`;
          
          if (nextCursor) {
            url += `&after=${nextCursor}`;
          }

          const mediaResponse = await fetch(url);
          const mediaData = await mediaResponse.json();

          if (mediaData.error) {
            console.error('Error fetching media:', mediaData.error);
            if (allMedia.length === 0) {
              result = mediaData;
              break;
            }
            // If we already have some media, continue with what we have
            break;
          }

          if (mediaData.data && mediaData.data.length > 0) {
            allMedia = allMedia.concat(mediaData.data);
          }

          // Check for next page
          nextCursor = mediaData.paging?.cursors?.after || null;
          pagesProcessed++;

          // No more pages available
          if (!nextCursor || !mediaData.data || mediaData.data.length === 0) {
            break;
          }
        }

        // Also fetch live Stories (only returns active/non-expired stories within 24h)
        try {
          const storiesUrl = `https://graph.facebook.com/v21.0/${instagramId}/stories?` +
            `fields=id,media_type,media_url,thumbnail_url,timestamp,permalink` +
            `&access_token=${accessToken}`;
          
          const storiesResponse = await fetch(storiesUrl);
          const storiesData = await storiesResponse.json();
          
          if (storiesData.data && storiesData.data.length > 0) {
            console.log(`Found ${storiesData.data.length} active stories`);
            // Mark stories with media_product_type = STORY
            const enrichedStories = storiesData.data.map((story: any) => ({
              ...story,
              media_product_type: 'STORY',
              caption: '', // Stories don't have captions in the API
              like_count: 0,
              comments_count: 0,
            }));
            allMedia = allMedia.concat(enrichedStories);
          }
        } catch (storiesErr) {
          console.log('Could not fetch stories (may not have permission):', storiesErr);
        }

        console.log(`Fetched ${allMedia.length} posts in ${pagesProcessed} pages`);

        // Trim to requested limit
        const mediaToProcess = allMedia.slice(0, targetLimit);

        // Enrich each media item with insights (process in batches to avoid rate limits)
        const enrichedMedia = await Promise.all(
          mediaToProcess.map(async (media: any) => {
            let insights = { views: null as number | null, saves: null as number | null, shares: null as number | null, avgViewDuration: null as number | null };

            try {
              // Determine metrics based on media type
              let metrics: string[] = [];
              
              // Stories have different available metrics
              if (media.media_product_type === 'STORY') {
                metrics = ['impressions', 'reach', 'replies'];
              } else if (media.media_type === 'VIDEO') {
                const isReel = media.media_product_type === 'REELS';
                if (isReel) {
                  metrics = ['plays', 'saved', 'shares', 'ig_reels_avg_watch_time'];
                } else {
                  metrics = ['video_views', 'saved', 'shares'];
                }
              } else if (media.media_type === 'IMAGE' || media.media_type === 'CAROUSEL_ALBUM') {
                metrics = ['saved', 'shares', 'impressions'];
              }

              if (metrics.length > 0) {
                const insightsResponse = await fetch(
                  `https://graph.facebook.com/v21.0/${media.id}/insights?` +
                  `metric=${metrics.join(',')}&access_token=${accessToken}`
                );
                const insightsData = await insightsResponse.json();

                if (insightsData.data) {
                  insightsData.data.forEach((metric: any) => {
                    const value = metric.values?.[0]?.value || 0;
                    if (metric.name === 'plays' || metric.name === 'video_views') {
                      insights.views = value;
                    }
                    if (metric.name === 'saved') {
                      insights.saves = value;
                    }
                    if (metric.name === 'shares') {
                      insights.shares = value;
                    }
                    if (metric.name === 'ig_reels_avg_watch_time') {
                      insights.avgViewDuration = value;
                    }
                    // For images, use impressions as a proxy for "views"
                    if (metric.name === 'impressions' && media.media_type !== 'VIDEO') {
                      insights.views = value;
                    }
                  });
                }
              }
            } catch (err) {
              console.log(`Could not fetch insights for media ${media.id}:`, err);
            }

            // Determine content type
            let contentType = 'post';
            if (media.media_product_type === 'STORY') {
              contentType = 'story';
            } else if (media.media_type === 'CAROUSEL_ALBUM') {
              contentType = 'carousel';
            } else if (media.media_type === 'VIDEO') {
              contentType = media.media_product_type === 'REELS' ? 'reel' : 'video';
            } else if (media.media_type === 'IMAGE') {
              contentType = 'image';
            }

            return {
              id: media.id,
              caption: media.caption || '',
              mediaType: media.media_type,
              mediaProductType: media.media_product_type,
              contentType,
              mediaUrl: media.media_url,
              thumbnailUrl: media.thumbnail_url || media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              views: insights.views,
              saves: insights.saves,
              shares: insights.shares,
              avgViewDuration: insights.avgViewDuration,
            };
          })
        );

        // Sort by timestamp descending (most recent first)
        enrichedMedia.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        console.log(`Successfully fetched instagram-media-with-insights`);
        result = { data: enrichedMedia };
        break;
      }

      case 'account-insights': {
        // Get comprehensive account insights for KPIs
        const datePreset = params.datePreset || 'last_30d';
        
        // Convert datePreset to since/until timestamps
        const now = Math.floor(Date.now() / 1000);
        let since = now - (30 * 24 * 60 * 60); // default last 30 days
        
        switch (datePreset) {
          case 'last_7d':
            since = now - (7 * 24 * 60 * 60);
            break;
          case 'last_14d':
            since = now - (14 * 24 * 60 * 60);
            break;
          case 'last_30d':
            since = now - (30 * 24 * 60 * 60);
            break;
          case 'last_90d':
            since = now - (90 * 24 * 60 * 60);
            break;
          case 'this_month':
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            since = Math.floor(startOfMonth.getTime() / 1000);
            break;
          case 'last_month':
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            lastMonth.setDate(1);
            lastMonth.setHours(0, 0, 0, 0);
            since = Math.floor(lastMonth.getTime() / 1000);
            break;
        }

        console.log(`Fetching account-insights with datePreset: ${datePreset}, since: ${since}, until: ${now}`);

        const results: any = {
          reach: 0,
          impressions: 0,
          engagement: 0,
          followers: 0,
          followersGrowth: 0,
          profileViews: 0,
          websiteClicks: 0,
          connectedPlatforms: ['meta'],
          datePreset,
          // Daily sparkline data for graphs (last 30 days)
          dailyReach: [] as number[],
          dailyImpressions: [] as number[],
          dailyEngagement: [] as number[],
          dailyFollowers: [] as number[],
          dailyProfileViews: [] as number[],
        };

        // Fetch Instagram insights if connected
        if (instagramId) {
          try {
            // Get basic account info
            const accountResponse = await fetch(
              `https://graph.facebook.com/v21.0/${instagramId}?` +
              `fields=followers_count,follows_count,media_count,username&access_token=${accessToken}`
            );
            const accountData = await accountResponse.json();
            console.log('Instagram account data:', JSON.stringify(accountData));
            
            if (accountData.followers_count) {
              results.followers = accountData.followers_count;
            }

            // Get insights for the specified date range
            // Note: Instagram API only returns last 30 days for these metrics with period=day
            const insightsMetrics = [
              'reach',
              'impressions', 
              'profile_views',
              'website_clicks',
              'follower_count'
            ].join(',');

            const insightsResponse = await fetch(
              `https://graph.facebook.com/v21.0/${instagramId}/insights?` +
              `metric=${insightsMetrics}&period=day&since=${since}&until=${now}&access_token=${accessToken}`
            );
            const insightsData = await insightsResponse.json();
            console.log('Instagram insights raw response:', JSON.stringify(insightsData));

            if (insightsData.data) {
              insightsData.data.forEach((metric: any) => {
                // Extract daily values for sparkline (last 30 data points)
                const dailyValues = metric.values 
                  ? metric.values.slice(-30).map((v: any) => v.value || 0)
                  : [];
                
                // Sum all values in the date range
                const totalValue = metric.values 
                  ? metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0)
                  : (metric.total_value?.value || 0);
                  
                switch (metric.name) {
                  case 'reach':
                    results.reach = totalValue;
                    results.dailyReach = dailyValues;
                    break;
                  case 'impressions':
                    results.impressions = totalValue;
                    results.dailyImpressions = dailyValues;
                    break;
                  case 'profile_views':
                    results.profileViews = totalValue;
                    results.dailyProfileViews = dailyValues;
                    break;
                  case 'website_clicks':
                    results.websiteClicks = totalValue;
                    break;
                  case 'follower_count':
                    results.dailyFollowers = dailyValues;
                    // Calculate follower growth from daily data
                    if (dailyValues.length >= 2) {
                      const firstValue = dailyValues[0];
                      const lastValue = dailyValues[dailyValues.length - 1];
                      if (firstValue > 0) {
                        results.followersGrowth = ((lastValue - firstValue) / firstValue) * 100;
                      }
                    }
                    break;
                }
              });
            }

            console.log(`Instagram insights for period ${datePreset}: reach=${results.reach}, impressions=${results.impressions}, followersGrowth=${results.followersGrowth}`);

            // Calculate engagement from recent media
            const mediaResponse = await fetch(
              `https://graph.facebook.com/v21.0/${instagramId}/media?` +
              `fields=like_count,comments_count&limit=20&access_token=${accessToken}`
            );
            const mediaData = await mediaResponse.json();

            if (mediaData.data && mediaData.data.length > 0) {
              const totalEngagement = mediaData.data.reduce((sum: number, post: any) => {
                return sum + (post.like_count || 0) + (post.comments_count || 0);
              }, 0);
              
              if (results.followers > 0) {
                results.engagement = ((totalEngagement / mediaData.data.length) / results.followers) * 100;
              }
            }

            results.instagram = {
              followers: results.followers,
              engagement: results.engagement,
              posts: accountData.media_count || 0,
              username: accountData.username,
            };
          } catch (err) {
            console.error('Error fetching Instagram insights:', err);
          }
        }

        // Fetch Facebook Page insights if connected
        if (pageId) {
          try {
            const pageResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}?` +
              `fields=fan_count,followers_count,name&access_token=${accessToken}`
            );
            const pageData = await pageResponse.json();

            results.facebook = {
              followers: pageData.followers_count || pageData.fan_count || 0,
              fans: pageData.fan_count || 0,
              name: pageData.name,
            };

            // Get page insights using the same date range
            const pageInsightsResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/insights?` +
              `metric=page_impressions,page_post_engagements,page_fans&period=day` +
              `&since=${since}&until=${now}&access_token=${accessToken}`
            );
            const pageInsightsData = await pageInsightsResponse.json();

            if (pageInsightsData.data) {
              pageInsightsData.data.forEach((metric: any) => {
                if (metric.name === 'page_impressions' && metric.values) {
                  const totalImpressions = metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
                  results.reach += Math.round(totalImpressions * 0.6); // Approximate reach from impressions
                }
                if (metric.name === 'page_post_engagements' && metric.values) {
                  const totalEngagements = metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
                  if (results.facebook.followers > 0) {
                    results.facebook.engagement = (totalEngagements / results.facebook.followers) * 100;
                  }
                }
              });
            }
          } catch (err) {
            console.error('Error fetching Facebook insights:', err);
          }
        }

        result = results;
        break;
      }

      case 'daily-insights': {
        // Get daily metrics for the last 30 days
        const days = params.days || 30;
        const dailyData: any[] = [];

        // Fetch Instagram daily insights if connected
        if (instagramId) {
          try {
            const insightsResponse = await fetch(
              `https://graph.facebook.com/v21.0/${instagramId}/insights?` +
              `metric=reach,impressions,profile_views&period=day&access_token=${accessToken}`
            );
            const insightsData = await insightsResponse.json();

            if (insightsData.data) {
              // Process reach data
              const reachMetric = insightsData.data.find((m: any) => m.name === 'reach');
              const impressionsMetric = insightsData.data.find((m: any) => m.name === 'impressions');
              const profileViewsMetric = insightsData.data.find((m: any) => m.name === 'profile_views');

              // Combine all metrics by date
              const dateMap = new Map<string, any>();

              if (reachMetric?.values) {
                reachMetric.values.forEach((v: any) => {
                  const date = v.end_time.split('T')[0];
                  if (!dateMap.has(date)) {
                    dateMap.set(date, { date, reach: 0, impressions: 0, engagement: 0 });
                  }
                  dateMap.get(date).reach = v.value || 0;
                });
              }

              if (impressionsMetric?.values) {
                impressionsMetric.values.forEach((v: any) => {
                  const date = v.end_time.split('T')[0];
                  if (!dateMap.has(date)) {
                    dateMap.set(date, { date, reach: 0, impressions: 0, engagement: 0 });
                  }
                  dateMap.get(date).impressions = v.value || 0;
                });
              }

              if (profileViewsMetric?.values) {
                profileViewsMetric.values.forEach((v: any) => {
                  const date = v.end_time.split('T')[0];
                  if (dateMap.has(date)) {
                    // Use profile views as a proxy for engagement activity
                    dateMap.get(date).engagement = v.value || 0;
                  }
                });
              }

              // Convert to array and sort by date
              dateMap.forEach((value) => dailyData.push(value));
            }
          } catch (err) {
            console.error('Error fetching Instagram daily insights:', err);
          }
        }

        // If no Instagram data, try Facebook Page insights
        if (dailyData.length === 0 && pageId) {
          try {
            const now = Math.floor(Date.now() / 1000);
            const daysAgo = now - (days * 24 * 60 * 60);

            const pageInsightsResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/insights?` +
              `metric=page_impressions,page_impressions_unique,page_post_engagements&period=day` +
              `&since=${daysAgo}&until=${now}&access_token=${accessToken}`
            );
            const pageInsightsData = await pageInsightsResponse.json();

            if (pageInsightsData.data) {
              const dateMap = new Map<string, any>();

              pageInsightsData.data.forEach((metric: any) => {
                if (metric.values) {
                  metric.values.forEach((v: any) => {
                    const date = v.end_time.split('T')[0];
                    if (!dateMap.has(date)) {
                      dateMap.set(date, { date, reach: 0, impressions: 0, engagement: 0 });
                    }
                    
                    if (metric.name === 'page_impressions_unique') {
                      dateMap.get(date).reach = v.value || 0;
                    } else if (metric.name === 'page_impressions') {
                      dateMap.get(date).impressions = v.value || 0;
                    } else if (metric.name === 'page_post_engagements') {
                      dateMap.get(date).engagement = v.value || 0;
                    }
                  });
                }
              });

              dateMap.forEach((value) => dailyData.push(value));
            }
          } catch (err) {
            console.error('Error fetching Facebook daily insights:', err);
          }
        }

        // Sort by date ascending
        dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Limit to requested days
        const limitedData = dailyData.slice(-days);

        result = { data: limitedData, source: instagramId ? 'instagram' : 'facebook' };
        break;
      }

      case 'stories': {
        if (!instagramId) {
          return new Response(JSON.stringify({ error: 'No Instagram account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch ALL active stories with pagination (default page size is 25)
        const initialStoriesUrl = `https://graph.facebook.com/v21.0/${instagramId}/stories?` +
          `fields=id,media_type,media_url,thumbnail_url,timestamp,permalink` +
          `&limit=100` +
          `&access_token=${accessToken}`;
        
        console.log(`Fetching stories for client ${clientId}`);
        let allStoriesData: any[] = [];
        let nextStoriesUrl: string | null = initialStoriesUrl;

        while (nextStoriesUrl) {
          const storiesResponse = await fetch(nextStoriesUrl);
          const storiesPage = await storiesResponse.json();

          if (storiesPage.error) {
            if (allStoriesData.length === 0) {
              console.error('Error fetching stories:', storiesPage.error);
              return new Response(JSON.stringify({ error: storiesPage.error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            break;
          }

          allStoriesData = allStoriesData.concat(storiesPage.data || []);
          nextStoriesUrl = storiesPage.paging?.next || null;
        }

        console.log(`Successfully fetched stories: ${allStoriesData.length} total`);

        // Enrich each story with insights
        const enrichedStories = await Promise.all(
          (allStoriesData).map(async (story: any) => {
            let insights = { impressions: 0, reach: 0, replies: 0 };

            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${story.id}/insights?` +
                `metric=impressions,reach,replies&access_token=${accessToken}`;
              const insightsRes = await fetch(insightsUrl);
              const insightsData = await insightsRes.json();

              console.log(`Story ${story.id} insights response:`, JSON.stringify(insightsData));

              if (insightsData.data) {
                for (const metric of insightsData.data) {
                  const value = metric.values?.[0]?.value || 0;
                  if (metric.name === 'impressions') insights.impressions = value;
                  if (metric.name === 'reach') insights.reach = value;
                  if (metric.name === 'replies') insights.replies = value;
                }
              } else if (insightsData.error) {
                console.warn(`Insights error for story ${story.id}:`, insightsData.error.message);
              }
            } catch (err) {
              console.warn(`Could not fetch insights for story ${story.id}:`, err);
            }

            return {
              ...story,
              ...insights,
            };
          })
        );

        console.log(`Successfully fetched stories with insights: ${enrichedStories.length} stories`);
        result = { stories: enrichedStories };
        break;
      }

      case 'whatsapp-conversations': {
        // Step 1: Discover WABA ID via the user token (not page token)
        const waToken = userAccessToken;
        if (!waToken) {
          return new Response(JSON.stringify({ error: 'No user access token available' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Try to get WABA from stored connection first
        let wabaId = (connection as any).waba_id || null;

        if (!wabaId) {
          // Discover WABA via the business account that owns the ad account or page
          // First try via debug_token to get the app-scoped business ID
          try {
            // Use the page's business to find WABAs
            const businessRes = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}?fields=business&access_token=${waToken}`
            );
            const businessData = await businessRes.json();
            console.log('Business discovery response:', JSON.stringify(businessData));

            const businessId = businessData?.business?.id;
            if (businessId) {
              const wabaRes = await fetch(
                `https://graph.facebook.com/v21.0/${businessId}/owned_whatsapp_business_accounts?access_token=${waToken}`
              );
              const wabaData = await wabaRes.json();
              console.log('WABA discovery response:', JSON.stringify(wabaData));

              if (wabaData.data && wabaData.data.length > 0) {
                wabaId = wabaData.data[0].id;
                console.log('Discovered WABA ID:', wabaId);
              } else if (wabaData.error) {
                console.warn('WABA discovery error:', wabaData.error.message);
                return new Response(JSON.stringify({ 
                  error: 'whatsapp_permission_missing',
                  message: 'El token no tiene permiso whatsapp_business_management. Es necesario reconectar Meta con ese permiso.',
                  details: wabaData.error.message
                }), {
                  status: 403,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch (err) {
            console.error('Error discovering WABA:', err);
          }
        }

        if (!wabaId) {
          return new Response(JSON.stringify({ 
            error: 'no_waba_found',
            message: 'No se encontró una cuenta de WhatsApp Business vinculada al portafolio comercial.'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Step 2: Fetch conversation analytics
        const waSince = params.since || Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
        const waUntil = params.until || Math.floor(Date.now() / 1000);
        const granularity = params.granularity || 'DAILY';

        const conversationUrl = `https://graph.facebook.com/v21.0/${wabaId}?` +
          `fields=conversation_analytics.start(${waSince}).end(${waUntil}).granularity(${granularity}).dimensions(["CONVERSATION_CATEGORY","CONVERSATION_TYPE","COUNTRY","PHONE"])` +
          `&access_token=${waToken}`;

        console.log('Fetching WhatsApp conversation analytics...');
        const waResponse = await fetch(conversationUrl);
        const waData = await waResponse.json();
        console.log('WhatsApp conversations response:', JSON.stringify(waData).substring(0, 500));

        if (waData.error) {
          return new Response(JSON.stringify({ 
            error: 'whatsapp_api_error',
            message: waData.error.message,
            code: waData.error.code
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        result = { 
          waba_id: wabaId,
          conversations: waData.conversation_analytics || waData
        };
        break;
      }

      case 'whatsapp-check': {
        // Quick check to see if WhatsApp Business access is available
        const checkToken = userAccessToken;
        if (!checkToken) {
          result = { hasAccess: false, reason: 'no_token' };
          break;
        }

        try {
          const bizRes = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}?fields=business&access_token=${checkToken}`
          );
          const bizData = await bizRes.json();
          const bizId = bizData?.business?.id;

          if (!bizId) {
            result = { hasAccess: false, reason: 'no_business' };
            break;
          }

          const wabaCheckRes = await fetch(
            `https://graph.facebook.com/v21.0/${bizId}/owned_whatsapp_business_accounts?access_token=${checkToken}`
          );
          const wabaCheckData = await wabaCheckRes.json();

          if (wabaCheckData.error) {
            result = { hasAccess: false, reason: 'permission_missing', error: wabaCheckData.error.message };
          } else if (wabaCheckData.data && wabaCheckData.data.length > 0) {
            result = { hasAccess: true, wabaId: wabaCheckData.data[0].id, wabaName: wabaCheckData.data[0].name };
          } else {
            result = { hasAccess: false, reason: 'no_waba_linked' };
          }
        } catch (err) {
          result = { hasAccess: false, reason: 'error', error: String(err) };
        }
        break;
      }

      case 'instagram-comments': {
        if (!instagramId) {
          return new Response(JSON.stringify({ error: 'No Instagram account connected' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const mediaId = params.mediaId;
        if (!mediaId) {
          return new Response(JSON.stringify({ error: 'Missing mediaId parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch all comments with pagination
        const allComments: any[] = [];
        let commentsUrl = `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=id,text,timestamp,username,from{id,username}&limit=100&access_token=${accessToken}`;
        
        let pageCount = 0;
        const maxPages = 20; // Safety limit: 20 pages × 100 = 2000 comments max
        
        while (commentsUrl && pageCount < maxPages) {
          const commentsResponse = await fetch(commentsUrl);
          const commentsData = await commentsResponse.json();
          
          if (commentsData.error) {
            console.error('Comments API error:', commentsData.error);
            result = { error: commentsData.error.message };
            break;
          }

          if (commentsData.data) {
            // Log first comment structure for debugging
            if (pageCount === 0 && commentsData.data.length > 0) {
              console.log('Sample comment structure:', JSON.stringify(commentsData.data[0]));
            }
            allComments.push(...commentsData.data);
          }

          commentsUrl = commentsData.paging?.next || null;
          pageCount++;
        }

        console.log(`Fetched ${allComments.length} comments for media ${mediaId}`);
        
        // Normalize comment data - ensure username is available
        const normalizedComments = allComments.map(c => ({
          id: c.id,
          text: c.text || '',
          timestamp: c.timestamp,
          username: c.username || c.from?.username || '',
          from: c.from || null,
        }));
        
        result = {
          comments: normalizedComments,
          totalCount: normalizedComments.length,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Successfully fetched ${endpoint}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meta-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});