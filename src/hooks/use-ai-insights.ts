import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContentPost } from '@/data/mockData';

export type InsightType = 'content-ideas' | 'trending-topics' | 'performance-analysis' | 'optimization-tips';

interface ContentSummary {
  totalPosts: number;
  topPlatform: string;
  avgEngagement: number;
  topPostTypes: string[];
  recentTrends: string[];
}

interface InsightResult {
  insightType: InsightType;
  trendingTopics: string[];
  insights: string[];
  recommendations: string[];
}

interface UseAIInsightsResult {
  isLoading: boolean;
  result: InsightResult | null;
  error: string | null;
  generateInsights: (type: InsightType) => Promise<void>;
}

function summarizeContent(content: ContentPost[]): ContentSummary {
  if (content.length === 0) {
    return {
      totalPosts: 0,
      topPlatform: 'instagram',
      avgEngagement: 0,
      topPostTypes: [],
      recentTrends: [],
    };
  }

  // Calculate average engagement
  const totalEngagement = content.reduce((sum, post) => sum + (post.engagement || 0), 0);
  const avgEngagement = Math.round(totalEngagement / content.length);

  // Find top platform
  const platformCounts: Record<string, number> = {};
  content.forEach(post => {
    platformCounts[post.network] = (platformCounts[post.network] || 0) + 1;
  });
  const topPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'instagram';

  // Find top post types by engagement
  const typeEngagements: Record<string, { total: number; count: number }> = {};
  content.forEach(post => {
    if (!typeEngagements[post.type]) {
      typeEngagements[post.type] = { total: 0, count: 0 };
    }
    typeEngagements[post.type].total += post.engagement || 0;
    typeEngagements[post.type].count += 1;
  });
  
  const topPostTypes = Object.entries(typeEngagements)
    .map(([type, data]) => ({ type, avgEng: data.total / data.count }))
    .sort((a, b) => b.avgEng - a.avgEng)
    .slice(0, 3)
    .map(item => item.type);

  // Recent trends (simple analysis)
  const recentTrends: string[] = [];
  const recentPosts = content.slice(0, 5);
  const olderPosts = content.slice(5, 10);
  
  if (recentPosts.length > 0 && olderPosts.length > 0) {
    const recentAvg = recentPosts.reduce((sum, p) => sum + (p.engagement || 0), 0) / recentPosts.length;
    const olderAvg = olderPosts.reduce((sum, p) => sum + (p.engagement || 0), 0) / olderPosts.length;
    
    if (recentAvg > olderAvg * 1.1) {
      recentTrends.push('Engagement en aumento');
    } else if (recentAvg < olderAvg * 0.9) {
      recentTrends.push('Engagement en descenso');
    } else {
      recentTrends.push('Engagement estable');
    }
  }

  return {
    totalPosts: content.length,
    topPlatform,
    avgEngagement,
    topPostTypes,
    recentTrends,
  };
}

export const useAIInsights = (
  clientId: string | null,
  clientName: string,
  industry: string,
  content: ContentPost[]
): UseAIInsightsResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateInsights = useCallback(async (type: InsightType) => {
    if (!clientId) {
      setError('No client selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contentSummary = summarizeContent(content);

      const { data, error: fnError } = await supabase.functions.invoke('ai-insights', {
        body: {
          clientId,
          clientName,
          industry: industry || 'general',
          contentSummary,
          insightType: type,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        insightType: type,
        trendingTopics: data.trendingTopics || [],
        insights: data.insights || [],
        recommendations: data.recommendations || [],
      });

      toast({
        title: 'Insights generados',
        description: 'Se han generado nuevos insights con IA.',
      });
    } catch (err) {
      console.error('Error generating insights:', err);
      const message = err instanceof Error ? err.message : 'Error al generar insights';
      setError(message);
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, clientName, industry, content, toast]);

  return {
    isLoading,
    result,
    error,
    generateInsights,
  };
};
