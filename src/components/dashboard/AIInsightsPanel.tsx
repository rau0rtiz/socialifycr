import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Lightbulb,
  RefreshCw,
  Zap,
  Plus,
  Globe,
  Target,
  DollarSign,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Link2,
  Play,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  ShoppingCart,
  Users,
  Award,
  Eye,
  Settings
} from 'lucide-react';
import { useAIInsights, InsightType, ContentIdea } from '@/hooks/use-ai-insights';
import { ContentPost } from '@/data/mockData';
import { VideoIdea } from '@/hooks/use-video-ideas';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AIInsightsPanelProps {
  clientId: string;
  clientName: string;
  industry: string;
  content: ContentPost[];
  hasAdAccount?: boolean;
  aiContext?: string | null;
  onEditContext?: () => void;
  onAddVideoIdea?: (idea: Omit<VideoIdea, 'id' | 'created_at' | 'updated_at' | 'todos'>) => Promise<VideoIdea | null>;
}

const REGIONS = [
  { value: '', label: 'Sin región', flag: '🌐' },
  { value: 'LATAM', label: 'Latinoamérica', flag: '🌎' },
  { value: 'CR', label: 'Costa Rica', flag: '🇨🇷' },
  { value: 'MX', label: 'México', flag: '🇲🇽' },
  { value: 'CO', label: 'Colombia', flag: '🇨🇴' },
  { value: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { value: 'ES', label: 'España', flag: '🇪🇸' },
  { value: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'PA', label: 'Panamá', flag: '🇵🇦' },
  { value: 'GT', label: 'Guatemala', flag: '🇬🇹' },
  { value: 'SV', label: 'El Salvador', flag: '🇸🇻' },
  { value: 'HN', label: 'Honduras', flag: '🇭🇳' },
  { value: 'NI', label: 'Nicaragua', flag: '🇳🇮' },
];

const insightTabs: { value: InsightType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'content-ideas', 
    label: 'Ideas', 
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Ideas de contenido basadas en tendencias actuales y contexto regional'
  },
  { 
    value: 'trending-topics', 
    label: 'Tendencias', 
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Temas trending en tu industria y región'
  },
  { 
    value: 'performance-analysis', 
    label: 'Análisis', 
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Análisis de rendimiento con recomendaciones por objetivo'
  },
  { 
    value: 'optimization-tips', 
    label: 'Optimización', 
    icon: <Zap className="h-4 w-4" />,
    description: 'Tips justificados con datos para mejorar tu engagement'
  },
];

export const AIInsightsPanel = ({ 
  clientId, 
  clientName, 
  industry, 
  content,
  hasAdAccount = false,
  aiContext,
  onEditContext,
  onAddVideoIdea
}: AIInsightsPanelProps) => {
  const [activeTab, setActiveTab] = useState<InsightType>('content-ideas');
  const [selectedCountry, setSelectedCountry] = useState<string>('CR');
  const [showContext, setShowContext] = useState(false);
  const [addingIdeaIndex, setAddingIdeaIndex] = useState<number | null>(null);
  
  const hasAIContext = !!aiContext;
  
  const { isLoading, result, error, generateInsights } = useAIInsights(
    clientId,
    clientName,
    industry,
    content,
    selectedCountry,
    '', // No additional context - using aiContext from client
    hasAdAccount
  );

  const handleGenerate = () => {
    generateInsights(activeTab);
  };

  const handleAddAsVideoIdea = async (idea: ContentIdea, index: number) => {
    if (!onAddVideoIdea) return;
    
    setAddingIdeaIndex(index);
    try {
      await onAddVideoIdea({
        client_id: clientId,
        url: '',
        platform: 'other',
        thumbnail_url: null,
        title: idea.idea,
        description: `${idea.description}\n\nFormato: ${idea.contentType}\nObjetivo: ${idea.goal}\n\n${idea.justification}`,
        tag_id: null,
        model_id: null,
      });
    } finally {
      setAddingIdeaIndex(null);
    }
  };

  const getContentTypeIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('reel') || lower.includes('video') || lower.includes('tiktok')) return Play;
    if (lower.includes('carrusel') || lower.includes('carousel')) return LayoutGrid;
    if (lower.includes('story')) return Eye;
    if (lower.includes('tweet')) return MessageSquare;
    return ImageIcon;
  };

  const getGoalIcon = (goal: string) => {
    const lower = goal.toLowerCase();
    if (lower.includes('venta') || lower.includes('sale')) return ShoppingCart;
    if (lower.includes('seguidor') || lower.includes('follower')) return Users;
    if (lower.includes('autoridad') || lower.includes('authority')) return Award;
    if (lower.includes('engagement')) return MessageSquare;
    return Eye;
  };

  const getGoalColor = (goal: string) => {
    const lower = goal.toLowerCase();
    if (lower.includes('venta') || lower.includes('sale')) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (lower.includes('seguidor') || lower.includes('follower')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (lower.includes('autoridad') || lower.includes('authority')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (lower.includes('engagement')) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const regionInfo = REGIONS.find(c => c.value === selectedCountry);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4">
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

          {/* Country selector and context */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(region => (
                    <SelectItem key={region.value || 'none'} value={region.value}>
                      <span className="flex items-center gap-2">
                        <span>{region.flag}</span>
                        {region.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasAIContext ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                onClick={() => setShowContext(!showContext)}
              >
                <Sparkles className="h-3 w-3" />
                Contexto IA activo
                {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={onEditContext}
              >
                <Plus className="h-3 w-3" />
                Agregar contexto
              </Button>
            )}

            {hasAdAccount && (
              <Badge variant="secondary" className="text-xs gap-1">
                <DollarSign className="h-3 w-3" />
                Ad Account conectado
              </Badge>
            )}
          </div>

          {/* Show current AI context */}
          <Collapsible open={showContext && hasAIContext}>
            <CollapsibleContent>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Contexto configurado para este cliente
                  </Label>
                  {onEditContext && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={onEditContext}
                    >
                      <Settings className="h-3 w-3" />
                      Editar
                    </Button>
                  )}
                </div>
                <div className="text-sm text-foreground bg-muted/50 border border-border/50 p-3 rounded-lg whitespace-pre-wrap">
                  {aiContext}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
                        Tendencias Actuales {regionInfo && regionInfo.value && `en ${regionInfo.label}`}
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

                  {/* Goal-based recommendations for Analysis tab */}
                  {tab.value === 'performance-analysis' && result.goalRecommendations && (
                    <div className="space-y-4">
                      {result.goalRecommendations.growth && result.goalRecommendations.growth.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            Para Crecimiento
                          </h4>
                          <ul className="space-y-2">
                            {result.goalRecommendations.growth.map((rec, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground bg-blue-500/5 border border-blue-500/20 p-2 rounded-lg">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.goalRecommendations.sales && result.goalRecommendations.sales.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Para Ventas
                          </h4>
                          <ul className="space-y-2">
                            {result.goalRecommendations.sales.map((rec, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground bg-green-500/5 border border-green-500/20 p-2 rounded-lg">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.goalRecommendations.content && result.goalRecommendations.content.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-purple-500" />
                            Para Contenido
                          </h4>
                          <ul className="space-y-2">
                            {result.goalRecommendations.content.map((rec, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground bg-purple-500/5 border border-purple-500/20 p-2 rounded-lg">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Ideas with structured format */}
                  {tab.value === 'content-ideas' && result.contentIdeas && result.contentIdeas.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Ideas de Contenido
                      </h4>
                      <div className="grid gap-3">
                        {result.contentIdeas.map((idea, idx) => {
                          const ContentTypeIcon = getContentTypeIcon(idea.contentType);
                          const GoalIcon = getGoalIcon(idea.goal);
                          
                          return (
                            <Card key={idx} className="bg-gradient-to-br from-muted/30 to-muted/10 border-border/50 overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        #{idx + 1}
                                      </span>
                                      <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                        <ContentTypeIcon className="h-3 w-3" />
                                        {idea.contentType}
                                      </Badge>
                                    </div>
                                    <h5 className="font-semibold text-foreground text-sm leading-tight">
                                      {idea.idea}
                                    </h5>
                                  </div>
                                  {onAddVideoIdea && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 px-3 text-xs shrink-0 gap-1"
                                      onClick={() => handleAddAsVideoIdea(idea, idx)}
                                      disabled={addingIdeaIndex === idx}
                                    >
                                      {addingIdeaIndex === idx ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Plus className="h-3 w-3" />
                                          Agregar
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-3">
                                  {idea.description}
                                </p>
                                
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs text-muted-foreground">Objetivo:</span>
                                  <Badge variant="outline" className={`text-xs gap-1 ${getGoalColor(idea.goal)}`}>
                                    <GoalIcon className="h-3 w-3" />
                                    {idea.goal}
                                  </Badge>
                                </div>
                                
                                {idea.justification && (
                                  <div className="bg-background/50 rounded-lg p-2.5 border border-border/30">
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground/80">Por qué funciona: </span>
                                      {idea.justification}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fallback for old insights format */}
                  {tab.value === 'content-ideas' && (!result.contentIdeas || result.contentIdeas.length === 0) && result.insights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Ideas de Contenido
                      </h4>
                      <ul className="space-y-2">
                        {result.insights.map((insight, idx) => (
                          <li 
                            key={idx} 
                            className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <span className="text-primary font-medium">{idx + 1}.</span>
                                <span>{insight}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Regular Insights (for other tabs) */}
                  {tab.value !== 'content-ideas' && tab.value !== 'performance-analysis' && result.insights.length > 0 && (
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

                  {/* Recommendations with justifications */}
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
                            className="text-sm text-muted-foreground bg-green-500/5 border border-green-500/20 p-3 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-green-600 font-medium">✓</span>
                              <div className="flex-1">
                                <span>{rec}</span>
                                {/* Justification */}
                                {result.justifications?.[result.insights.length + idx] && (
                                  <div className="mt-2 text-xs text-muted-foreground/80 border-l-2 border-green-500/20 pl-2">
                                    <span className="font-medium">Justificación: </span>
                                    {result.justifications[result.insights.length + idx]}
                                  </div>
                                )}
                                {/* Source link if available */}
                                {result.sources?.[idx] && (
                                  <a 
                                    href={result.sources[idx]} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <Link2 className="h-3 w-3" />
                                    Ver fuente
                                  </a>
                                )}
                              </div>
                            </div>
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
                  <p className="text-xs mt-1 text-muted-foreground/70">
                    Región: {regionInfo?.flag} {regionInfo?.label || 'Sin región'}
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
