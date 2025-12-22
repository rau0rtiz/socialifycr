import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Lightbulb,
  RefreshCw,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useAIInsights, InsightType } from '@/hooks/use-ai-insights';
import { ContentPost } from '@/data/mockData';

interface AIInsightsPanelProps {
  clientId: string;
  clientName: string;
  industry: string;
  content: ContentPost[];
}

const insightTabs: { value: InsightType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'content-ideas', 
    label: 'Ideas', 
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Ideas de contenido basadas en tendencias actuales'
  },
  { 
    value: 'trending-topics', 
    label: 'Tendencias', 
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Temas trending en tu industria'
  },
  { 
    value: 'performance-analysis', 
    label: 'Análisis', 
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Análisis de rendimiento de tu contenido'
  },
  { 
    value: 'optimization-tips', 
    label: 'Optimización', 
    icon: <Zap className="h-4 w-4" />,
    description: 'Tips para mejorar tu engagement'
  },
];

export const AIInsightsPanel = ({ 
  clientId, 
  clientName, 
  industry, 
  content 
}: AIInsightsPanelProps) => {
  const [activeTab, setActiveTab] = useState<InsightType>('content-ideas');
  const { isLoading, result, error, generateInsights } = useAIInsights(
    clientId,
    clientName,
    industry,
    content
  );

  const handleGenerate = () => {
    generateInsights(activeTab);
  };

  const currentTab = insightTabs.find(t => t.value === activeTab);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Insights</CardTitle>
              <CardDescription className="text-xs">
                Powered by Perplexity + Gemini
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InsightType)}>
          <TabsList className="grid grid-cols-4 w-full">
            {insightTabs.map(tab => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="text-xs gap-1 px-2"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {insightTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{tab.description}</p>

              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}

              {error && !isLoading && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {!isLoading && !error && result && result.insightType === tab.value && (
                <div className="space-y-4">
                  {/* Trending Topics */}
                  {result.trendingTopics.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Tendencias Actuales
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.trendingTopics.map((topic, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {result.insights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Insights
                      </h4>
                      <ul className="space-y-2">
                        {result.insights.map((insight, idx) => (
                          <li 
                            key={idx} 
                            className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-start gap-2"
                          >
                            <span className="text-primary font-medium">{idx + 1}.</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        Recomendaciones
                      </h4>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, idx) => (
                          <li 
                            key={idx} 
                            className="text-sm text-muted-foreground bg-green-500/5 border border-green-500/20 p-2 rounded-lg flex items-start gap-2"
                          >
                            <span className="text-green-600 font-medium">✓</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !error && (!result || result.insightType !== tab.value) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Haz clic en "Generar" para obtener insights con IA
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
