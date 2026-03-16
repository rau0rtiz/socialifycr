import { useState, useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { usePublicationGoals } from '@/hooks/use-publication-goals';
import { ContentPost } from '@/data/mockData';
import { Target, Pencil, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface PublicationGoalsSectionProps {
  clientId: string;
  currentMonth: Date;
  content: ContentPost[];
}

export const PublicationGoalsSection = ({ clientId, currentMonth, content }: PublicationGoalsSectionProps) => {
  const { goals, upsertGoal } = usePublicationGoals(clientId);
  const [editing, setEditing] = useState(false);
  const [targetPosts, setTargetPosts] = useState('');
  const [targetReach, setTargetReach] = useState('');

  const monthKey = format(startOfMonth(currentMonth), 'yyyy-MM-dd');

  const currentGoal = useMemo(() => 
    goals.find(g => g.month === monthKey),
    [goals, monthKey]
  );

  // Count posts and reach for this month
  const { postCount, totalReach } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    const monthPosts = content.filter(post => {
      if (!post.date) return false;
      const d = new Date(post.date);
      return d >= monthStart && d <= monthEnd;
    });

    return {
      postCount: monthPosts.length,
      totalReach: monthPosts.reduce((sum, p) => sum + (p.reach || 0), 0),
    };
  }, [content, currentMonth]);

  const startEditing = () => {
    setTargetPosts(String(currentGoal?.target_posts || 0));
    setTargetReach(String(currentGoal?.target_reach || 0));
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsertGoal.mutateAsync({
        month: monthKey,
        target_posts: parseInt(targetPosts) || 0,
        target_reach: parseInt(targetReach) || 0,
      });
      toast.success('Meta de publicación guardada');
      setEditing(false);
    } catch {
      toast.error('Error guardando meta');
    }
  };

  const postsPercent = currentGoal?.target_posts ? Math.min((postCount / currentGoal.target_posts) * 100, 100) : 0;
  const reachPercent = currentGoal?.target_reach ? Math.min((totalReach / currentGoal.target_reach) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas de publicación — {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditing}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={upsertGoal.isPending}>
                <Check className="h-3 w-3 mr-1" /> Guardar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta de publicaciones</Label>
              <Input
                type="number"
                min="0"
                value={targetPosts}
                onChange={(e) => setTargetPosts(e.target.value)}
                className="h-8 text-sm"
                placeholder="Ej: 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meta de alcance total</Label>
              <Input
                type="number"
                min="0"
                value={targetReach}
                onChange={(e) => setTargetReach(e.target.value)}
                className="h-8 text-sm"
                placeholder="Ej: 50000"
              />
            </div>
          </div>
        ) : currentGoal ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Publicaciones</span>
                <span className="font-medium">{postCount} / {currentGoal.target_posts}</span>
              </div>
              <Progress value={postsPercent} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{postsPercent.toFixed(0)}% completado</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Alcance</span>
                <span className="font-medium">{totalReach.toLocaleString()} / {currentGoal.target_reach.toLocaleString()}</span>
              </div>
              <Progress value={reachPercent} className="h-2" />
              <p className="text-[10px] text-muted-foreground">{reachPercent.toFixed(0)}% completado</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-muted-foreground">
            <p className="text-xs">No hay metas configuradas para este mes.</p>
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={startEditing}>
              <Target className="h-3 w-3 mr-1" /> Establecer metas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
