import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ContentPost } from '@/data/mockData';
import { Gift, Loader2, Trophy, Users, Filter, Shuffle, Check, X } from 'lucide-react';
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

export const GiveawayWidget = ({ clientId, instagramContent }: GiveawayWidgetProps) => {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [comments, setComments] = useState<GiveawayComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<GiveawayConditions>({
    minMentions: 0,
    requiredHashtag: '',
    uniquePerUser: true,
  });
  const [winner, setWinner] = useState<GiveawayComment | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const igPosts = useMemo(
    () => instagramContent.filter(p => p.network === 'instagram' && p.isLiveData),
    [instagramContent]
  );

  const fetchComments = useCallback(async () => {
    if (!selectedMediaId) return;
    setLoading(true);
    setWinner(null);
    setComments([]);
    try {
      const { data, error } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint: 'instagram-comments', params: { mediaId: selectedMediaId } },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Error al obtener comentarios');
        return;
      }
      setComments(data.comments || []);
      toast.success(`${data.totalCount} comentarios cargados`);
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedMediaId]);

  // Deduplicate by username (keep first comment)
  const uniqueParticipants = useMemo(() => {
    if (!conditions.uniquePerUser) return comments;
    const seen = new Map<string, GiveawayComment>();
    comments.forEach(c => {
      const uname = (c.username || c.from?.username || '').toLowerCase();
      if (uname && !seen.has(uname)) {
        seen.set(uname, c);
      }
    });
    return Array.from(seen.values());
  }, [comments, conditions.uniquePerUser]);

  // Apply filters
  const validParticipants = useMemo(() => {
    return uniqueParticipants.filter(c => {
      // Min mentions
      if (conditions.minMentions > 0) {
        const mentions = (c.text.match(/@[\w.]+/g) || []).length;
        if (mentions < conditions.minMentions) return false;
      }
      // Required hashtag
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

    // Visual spinning effect
    let count = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * validParticipants.length);
      setWinner(validParticipants[randomIdx]);
      count++;
      if (count >= maxSpins) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * validParticipants.length);
        setWinner(validParticipants[finalIdx]);
        setIsSpinning(false);
      }
    }, 100);
  }, [validParticipants]);

  const selectedPost = igPosts.find(p => p.id === selectedMediaId);

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Sorteo / Giveaway
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Select post */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">1. Seleccionar publicación</Label>
          <Select value={selectedMediaId || ''} onValueChange={setSelectedMediaId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí una publicación de Instagram..." />
            </SelectTrigger>
            <SelectContent>
              {igPosts.map(post => (
                <SelectItem key={post.id} value={post.id}>
                  <div className="flex items-center gap-2">
                    {post.thumbnailUrl && (
                      <img src={post.thumbnailUrl} alt="" className="h-6 w-6 rounded object-cover" />
                    )}
                    <span className="truncate max-w-[300px]">
                      {post.caption?.substring(0, 60) || post.title}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPost && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>❤️ {selectedPost.likes || 0}</span>
              <span>💬 {selectedPost.comments || 0}</span>
              <span>{new Date(selectedPost.date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Step 2: Conditions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">2. Condiciones del sorteo</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Menciones mínimas (@)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={conditions.minMentions}
                onChange={e => setConditions(prev => ({ ...prev, minMentions: parseInt(e.target.value) || 0 }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hashtag requerido</Label>
              <Input
                placeholder="#sorteo"
                value={conditions.requiredHashtag}
                onChange={e => setConditions(prev => ({ ...prev, requiredHashtag: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Checkbox
                id="unique-per-user"
                checked={conditions.uniquePerUser}
                onCheckedChange={checked => setConditions(prev => ({ ...prev, uniquePerUser: !!checked }))}
              />
              <Label htmlFor="unique-per-user" className="text-xs cursor-pointer">
                Una entrada por usuario
              </Label>
            </div>
          </div>
        </div>

        {/* Step 3: Load comments */}
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchComments}
            disabled={!selectedMediaId || loading}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
            Cargar comentarios
          </Button>
          {comments.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{comments.length} comentarios</span>
              <span>→</span>
              <span className="font-medium text-foreground">{uniqueParticipants.length} únicos</span>
              <span>→</span>
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                {validParticipants.length} válidos
              </Badge>
            </div>
          )}
        </div>

        {/* Participants list */}
        {comments.length > 0 && (
          <ScrollArea className="h-48 rounded-md border bg-background/50 p-3">
            <div className="space-y-1">
              {uniqueParticipants.map(c => {
                const isValid = validParticipants.includes(c);
                const isWinner = winner?.id === c.id && !isSpinning;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex items-center gap-2 p-1.5 rounded text-sm transition-colors',
                      isWinner && 'bg-primary/20 ring-2 ring-primary',
                      !isValid && 'opacity-40',
                      isValid && !isWinner && 'hover:bg-muted/50'
                    )}
                  >
                    {isValid ? (
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-destructive shrink-0" />
                    )}
                    <span className="font-medium text-xs">@{c.username || c.from?.username}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{c.text}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Step 4: Pick winner */}
        {validParticipants.length > 0 && (
          <div className="space-y-3">
            <Button
              onClick={pickWinner}
              disabled={isSpinning}
              className="w-full"
              size="lg"
            >
              {isSpinning ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Shuffle className="h-5 w-5 mr-2" />
              )}
              {isSpinning ? 'Eligiendo...' : '🎉 Elegir ganador'}
            </Button>

            {winner && !isSpinning && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="font-bold text-lg">@{winner.username || winner.from?.username}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-md">{winner.text}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
