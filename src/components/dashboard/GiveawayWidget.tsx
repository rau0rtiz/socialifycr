import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { ContentPost } from '@/data/mockData';
import { Gift, Loader2, Trophy, Users, Shuffle, Check, X, ChevronRight, ArrowLeft, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GiveawayComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  from?: { id: string; username: string };
}

interface GiveawayConditions {
  minMentions: number;
  requiredHashtag: string;
  uniquePerUser: boolean;
}

interface GiveawayWidgetProps {
  clientId: string;
  instagramContent: ContentPost[];
}

type Step = 'select-post' | 'configure' | 'results';

export const GiveawayWidget = ({ clientId, instagramContent }: GiveawayWidgetProps) => {
  const [step, setStep] = useState<Step>('select-post');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [comments, setComments] = useState<GiveawayComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [conditions, setConditions] = useState<GiveawayConditions>({
    minMentions: 0,
    requiredHashtag: '',
    uniquePerUser: true,
  });
  const [winner, setWinner] = useState<GiveawayComment | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const igPosts = useMemo(
    () => instagramContent.filter(p => p.network === 'instagram' && p.isLiveData),
    [instagramContent]
  );

  const selectedPost = igPosts.find(p => p.id === selectedMediaId);

  const fetchComments = useCallback(async () => {
    if (!selectedMediaId) return;
    setLoading(true);
    setWinner(null);
    setComments([]);
    setLoadProgress(10);

    const progressInterval = setInterval(() => {
      setLoadProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 400);

    try {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint: 'instagram-comments', params: { mediaId: selectedMediaId } },
      });
      clearInterval(progressInterval);
      setLoadProgress(100);

      if (error || data?.error) {
        toast.error(data?.error || 'Error al obtener comentarios');
        setLoadProgress(0);
        return;
      }
      
      const fetchedComments = data.comments || [];
      
      // Log sample for debugging
      if (fetchedComments.length > 0) {
        console.log('Sample comment:', JSON.stringify(fetchedComments[0]));
      }
      
      setComments(fetchedComments);
      toast.success(`${data.totalCount} comentarios cargados`);
      setStep('results');
    } catch (err) {
      clearInterval(progressInterval);
      setLoadProgress(0);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedMediaId]);

  // Get display username for a comment
  const getUsername = (c: GiveawayComment): string => {
    return c.username || c.from?.username || `user_${c.id.slice(-6)}`;
  };

  const uniqueParticipants = useMemo(() => {
    if (!conditions.uniquePerUser) return comments;
    const seen = new Map<string, GiveawayComment>();
    comments.forEach(c => {
      const uname = getUsername(c).toLowerCase();
      if (!seen.has(uname)) seen.set(uname, c);
    });
    return Array.from(seen.values());
  }, [comments, conditions.uniquePerUser]);

  const validParticipants = useMemo(() => {
    return uniqueParticipants.filter(c => {
      if (conditions.minMentions > 0) {
        const mentions = (c.text.match(/@[\w.]+/g) || []).length;
        if (mentions < conditions.minMentions) return false;
      }
      if (conditions.requiredHashtag.trim()) {
        const tag = conditions.requiredHashtag.trim().toLowerCase().replace(/^#/, '');
        if (!c.text.toLowerCase().includes(`#${tag}`)) return false;
      }
      return true;
    });
  }, [uniqueParticipants, conditions]);

  const pickWinner = useCallback(() => {
    if (validParticipants.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    let count = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      setWinner(validParticipants[Math.floor(Math.random() * validParticipants.length)]);
      count++;
      if (count >= maxSpins) {
        clearInterval(interval);
        setWinner(validParticipants[Math.floor(Math.random() * validParticipants.length)]);
        setIsSpinning(false);
      }
    }, 100);
  }, [validParticipants]);

  const stepIndex = step === 'select-post' ? 0 : step === 'configure' ? 1 : 2;
  const overallProgress = step === 'select-post' ? 0 : step === 'configure' ? 50 : 100;

  // Check if any comment has a real username
  const hasUsernames = comments.length > 0 && comments.some(c => c.username || c.from?.username);

  return (
    <Card className="border-2 border-primary/20 overflow-hidden">
      {/* Header with progress */}
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Sorteo / Giveaway
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {['Publicación', 'Configurar', 'Resultado'].map((label, i) => (
              <span key={label} className="flex items-center gap-1">
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors',
                  i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>{i + 1}</span>
                <span className={cn(i <= stepIndex ? 'text-foreground font-medium' : '')}>{label}</span>
                {i < 2 && <ChevronRight className="h-3 w-3" />}
              </span>
            ))}
          </div>
        </div>
        <Progress value={overallProgress} className="h-1 mt-2" />
      </CardHeader>

      <CardContent className="p-4">
        {/* STEP 1: Post grid */}
        {step === 'select-post' && (
          <div className="animate-fade-in space-y-3">
            <p className="text-sm text-muted-foreground">Seleccioná la publicación del sorteo:</p>
            {igPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay publicaciones de Instagram disponibles.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {igPosts.slice(0, 30).map(post => (
                  <button
                    key={post.id}
                    onClick={() => {
                      setSelectedMediaId(post.id);
                      setStep('configure');
                    }}
                    className={cn(
                      'group relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
                      selectedMediaId === post.id
                        ? 'border-primary ring-2 ring-primary/50'
                        : 'border-transparent hover:border-primary/40'
                    )}
                  >
                    <img
                      src={post.thumbnailUrl || post.thumbnail || '/placeholder.svg'}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                      <div className="text-white text-[10px] leading-tight space-y-0.5 w-full">
                        <div className="flex justify-between">
                          <span>❤️ {post.likes?.toLocaleString() || 0}</span>
                          <span>💬 {post.comments?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1 right-1">
                      <span className="text-[8px] px-1 py-0 bg-black/60 text-white rounded">
                        {post.type === 'reel' ? '🎬' : post.type === 'carousel' ? '📸' : '🖼️'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Configure & load */}
        {step === 'configure' && selectedPost && (
          <div className="animate-fade-in space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('select-post')} className="mb-1 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Cambiar publicación
            </Button>

            {/* Selected post preview */}
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border">
              <img
                src={selectedPost.thumbnailUrl || selectedPost.thumbnail || '/placeholder.svg'}
                alt=""
                className="w-20 h-20 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{selectedPost.caption || selectedPost.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>❤️ {selectedPost.likes?.toLocaleString() || 0}</span>
                  <span>💬 {selectedPost.comments?.toLocaleString() || 0}</span>
                  <span>{new Date(selectedPost.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Condiciones (opcional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Menciones mínimas (@)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={conditions.minMentions}
                    onChange={e => setConditions(prev => ({ ...prev, minMentions: parseInt(e.target.value) || 0 }))}
                    className="h-8"
                    placeholder="0 = sin requisito"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hashtag requerido</Label>
                  <Input
                    placeholder="Ej: #sorteo (dejar vacío = sin requisito)"
                    value={conditions.requiredHashtag}
                    onChange={e => setConditions(prev => ({ ...prev, requiredHashtag: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unique-per-user"
                  checked={conditions.uniquePerUser}
                  onCheckedChange={checked => setConditions(prev => ({ ...prev, uniquePerUser: !!checked }))}
                />
                <Label htmlFor="unique-per-user" className="text-sm cursor-pointer">
                  Una entrada por usuario (recomendado)
                </Label>
              </div>
            </div>

            {/* Load button + progress */}
            <div className="space-y-2">
              <Button onClick={fetchComments} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Users className="h-5 w-5 mr-2" />}
                {loading ? 'Cargando comentarios...' : 'Cargar comentarios'}
              </Button>
              {loading && (
                <div className="space-y-1 animate-fade-in">
                  <Progress value={loadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">Obteniendo comentarios de Instagram...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setStep('configure'); setComments([]); setWinner(null); setShowPreview(false); }} className="-ml-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{comments.length} comentarios</Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline">{uniqueParticipants.length} únicos</Badge>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  {validParticipants.length} válidos
                </Badge>
              </div>
            </div>

            {/* Warning if no usernames */}
            {!hasUsernames && comments.length > 0 && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ La API de Instagram no devolvió nombres de usuario para estos comentarios. 
                La deduplicación por usuario no será posible — cada comentario se tratará como una entrada individual.
              </div>
            )}

            {/* Comment preview toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Ocultar preview de comentarios' : `Ver preview de comentarios (${comments.length})`}
            </Button>

            {/* Comment preview */}
            {showPreview && (
              <ScrollArea className="h-64 rounded-lg border bg-muted/30 p-2">
                <div className="space-y-1">
                  {comments.slice(0, 100).map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted"
                    >
                      <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-primary">
                          @{getUsername(c)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{c.text}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {comments.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... y {comments.length - 100} comentarios más
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Participants list */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Participantes válidos:</p>
              <ScrollArea className="h-52 rounded-lg border bg-muted/30 p-2">
                <div className="space-y-0.5">
                  {uniqueParticipants.map(c => {
                    const isValid = validParticipants.includes(c);
                    const isWinnerHighlight = winner?.id === c.id && !isSpinning;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-150',
                          isWinnerHighlight && 'bg-primary/20 ring-2 ring-primary scale-[1.02]',
                          !isValid && 'opacity-30',
                          isValid && !isWinnerHighlight && 'hover:bg-muted'
                        )}
                      >
                        {isValid ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className="font-semibold text-xs min-w-[100px]">@{getUsername(c)}</span>
                        <span className="text-xs text-muted-foreground truncate flex-1">{c.text}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Winner section */}
            <div className="space-y-3">
              <Button
                onClick={pickWinner}
                disabled={isSpinning || validParticipants.length === 0}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isSpinning ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Shuffle className="h-5 w-5 mr-2" />
                )}
                {isSpinning ? 'Eligiendo...' : '🎉 Elegir ganador al azar'}
              </Button>

              {winner && !isSpinning && (
                <div className="animate-scale-in">
                  <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 shadow-lg">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                        <Trophy className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ganador/a</p>
                        <p className="font-bold text-xl">@{getUsername(winner)}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-md mt-0.5">{winner.text}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
