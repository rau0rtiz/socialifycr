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
    const { clientId, endpoint, params = {} } = await req.json();

    if (!clientId || !endpoint) {
      return new Response(JSON.stringify({ error: 'Missing clientId or endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connection from database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'meta')
      .eq('status', 'active')
      .maybeSingle();

    if (connectionError || !connection) {
      console.log('No active Meta connection for client:', clientId);
      return new Response(JSON.stringify({ error: 'No active Meta connection found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = connection.access_token;
    const pageId = connection.platform_page_id;
    const instagramId = connection.instagram_account_id;
    const adAccountId = connection.ad_account_id;

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
          `https://graph.facebook.com/v18.0/${pageId}/insights?` +
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
          `https://graph.facebook.com/v18.0/${instagramId}/insights?` +
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
          `https://graph.facebook.com/v18.0/${instagramId}/media?` +
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
          `https://graph.facebook.com/v18.0/${pageId}/posts?` +
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
          `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
          `fields=impressions,reach,spend,cpc,cpm,clicks,actions` +
          `&date_preset=${datePreset}&access_token=${accessToken}`
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

        // Get campaigns first
        const datePreset = params.datePreset || 'last_30d';
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
          `fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time` +
          `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]` +
          `&limit=50&access_token=${accessToken}`
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
                `https://graph.facebook.com/v18.0/${campaign.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type,purchase_roas` +
                `&date_preset=${datePreset}&access_token=${accessToken}`
              );
              const insightsData = await insightsResponse.json();
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

        result = { data: campaignsWithInsights };
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

        // Get ad sets for a specific campaign
        const datePreset = params.datePreset || 'last_30d';
        const adsetsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${campaignId}/adsets?` +
          `fields=id,name,status,effective_status,daily_budget,lifetime_budget,start_time,end_time,optimization_goal,billing_event` +
          `&limit=50&access_token=${accessToken}`
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
                `https://graph.facebook.com/v18.0/${adset.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type` +
                `&date_preset=${datePreset}&access_token=${accessToken}`
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

        result = { data: adsetsWithInsights };
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

        // Get ads for a specific ad set with creative info
        const datePreset = params.datePreset || 'last_30d';
        const adsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${adsetId}/ads?` +
          `fields=id,name,status,effective_status,creative{id,name,thumbnail_url}` +
          `&limit=50&access_token=${accessToken}`
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
                `https://graph.facebook.com/v18.0/${ad.id}/insights?` +
                `fields=impressions,reach,spend,clicks,cpc,cpm,actions,cost_per_action_type` +
                `&date_preset=${datePreset}&access_token=${accessToken}`
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

        result = { data: adsWithInsights };
        break;
      }

      case 'page-info': {
        // Get basic page and Instagram info
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?` +
          `fields=id,name,fan_count,followers_count,picture,category&access_token=${accessToken}`
        );
        const pageData = await pageResponse.json();

        let instagramData = null;
        if (instagramId) {
          const igResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramId}?` +
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

        // Get recent Instagram media with basic info
        const limit = params.limit || 6;
        const mediaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${instagramId}/media?` +
          `fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
          `&limit=${limit}&access_token=${accessToken}`
        );
        const mediaData = await mediaResponse.json();

        if (mediaData.error) {
          console.error('Error fetching media:', mediaData.error);
          result = mediaData;
          break;
        }

        // Enrich each media item with insights
        const enrichedMedia = await Promise.all(
          (mediaData.data || []).map(async (media: any) => {
            let insights = { views: null, avgViewDuration: null };

            // Only fetch insights for VIDEO and REELS
            if (media.media_type === 'VIDEO') {
              try {
                // Determine metrics based on media product type
                const isReel = media.media_product_type === 'REELS';
                const metrics = isReel 
                  ? 'plays,ig_reels_avg_watch_time' 
                  : 'video_views';

                const insightsResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${media.id}/insights?` +
                  `metric=${metrics}&access_token=${accessToken}`
                );
                const insightsData = await insightsResponse.json();

                if (insightsData.data) {
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'plays' || metric.name === 'video_views') {
                      insights.views = metric.values?.[0]?.value || 0;
                    }
                    if (metric.name === 'ig_reels_avg_watch_time') {
                      insights.avgViewDuration = metric.values?.[0]?.value || 0;
                    }
                  });
                }
              } catch (err) {
                console.log(`Could not fetch insights for media ${media.id}:`, err);
              }
            }

            // Determine content type
            let contentType = 'post';
            if (media.media_type === 'CAROUSEL_ALBUM') {
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
              avgViewDuration: insights.avgViewDuration,
            };
          })
        );

        // Sort by timestamp descending (most recent first)
        enrichedMedia.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        result = { data: enrichedMedia };
        break;
      }

      case 'account-insights': {
        // Get comprehensive account insights for KPIs
        const results: any = {
          reach: 0,
          impressions: 0,
          engagement: 0,
          followers: 0,
          followersGrowth: 0,
          profileViews: 0,
          websiteClicks: 0,
          connectedPlatforms: ['meta'],
        };

        // Fetch Instagram insights if connected
        if (instagramId) {
          try {
            // Get basic account info
            const accountResponse = await fetch(
              `https://graph.facebook.com/v18.0/${instagramId}?` +
              `fields=followers_count,follows_count,media_count,username&access_token=${accessToken}`
            );
            const accountData = await accountResponse.json();
            
            if (accountData.followers_count) {
              results.followers = accountData.followers_count;
            }

            // Get recent insights (last 30 days)
            const insightsMetrics = [
              'reach',
              'impressions',
              'profile_views',
              'website_clicks',
              'follower_count'
            ].join(',');

            const insightsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${instagramId}/insights?` +
              `metric=${insightsMetrics}&period=day&metric_type=total_value&access_token=${accessToken}`
            );
            const insightsData = await insightsResponse.json();

            if (insightsData.data) {
              insightsData.data.forEach((metric: any) => {
                const value = metric.total_value?.value || 0;
                switch (metric.name) {
                  case 'reach':
                    results.reach = value;
                    break;
                  case 'impressions':
                    results.impressions = value;
                    break;
                  case 'profile_views':
                    results.profileViews = value;
                    break;
                  case 'website_clicks':
                    results.websiteClicks = value;
                    break;
                }
              });
            }

            // Calculate engagement from recent media
            const mediaResponse = await fetch(
              `https://graph.facebook.com/v18.0/${instagramId}/media?` +
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
              `https://graph.facebook.com/v18.0/${pageId}?` +
              `fields=fan_count,followers_count,name&access_token=${accessToken}`
            );
            const pageData = await pageResponse.json();

            results.facebook = {
              followers: pageData.followers_count || pageData.fan_count || 0,
              fans: pageData.fan_count || 0,
              name: pageData.name,
            };

            // Get page insights
            const now = Math.floor(Date.now() / 1000);
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
            
            const pageInsightsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${pageId}/insights?` +
              `metric=page_impressions,page_post_engagements,page_fans&period=day` +
              `&since=${thirtyDaysAgo}&until=${now}&access_token=${accessToken}`
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
              `https://graph.facebook.com/v18.0/${instagramId}/insights?` +
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
              `https://graph.facebook.com/v18.0/${pageId}/insights?` +
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