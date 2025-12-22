import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Plus, 
  Trash2, 
  ExternalLink,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Video
} from 'lucide-react';
import { useCompetitors, Competitor, CompetitorPlatform, NewCompetitor } from '@/hooks/use-competitors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompetitorsPanelProps {
  clientId: string;
  canEdit: boolean;
}

const PLATFORMS: { value: CompetitorPlatform; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'youtube', label: 'YouTube', icon: <Youtube className="h-4 w-4" />, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  { value: 'instagram', label: 'Instagram', icon: <Instagram className="h-4 w-4" />, color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  { value: 'facebook', label: 'Facebook', icon: <Facebook className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'tiktok', label: 'TikTok', icon: <Video className="h-4 w-4" />, color: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
  { value: 'twitter', label: 'X (Twitter)', icon: <Twitter className="h-4 w-4" />, color: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
  { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, color: 'bg-blue-700/10 text-blue-700 border-blue-700/30' },
];

const getPlatformInfo = (platform: CompetitorPlatform) => {
  return PLATFORMS.find(p => p.value === platform) || PLATFORMS[0];
};

const getProfileUrl = (platform: CompetitorPlatform, username: string): string => {
  const cleanUsername = username.replace('@', '');
  switch (platform) {
    case 'youtube':
      return `https://youtube.com/@${cleanUsername}`;
    case 'instagram':
      return `https://instagram.com/${cleanUsername}`;
    case 'facebook':
      return `https://facebook.com/${cleanUsername}`;
    case 'tiktok':
      return `https://tiktok.com/@${cleanUsername}`;
    case 'twitter':
      return `https://x.com/${cleanUsername}`;
    case 'linkedin':
      return `https://linkedin.com/company/${cleanUsername}`;
    default:
      return '#';
  }
};

export const CompetitorsPanel = ({ clientId, canEdit }: CompetitorsPanelProps) => {
  const { competitors, isLoading, addCompetitor, deleteCompetitor } = useCompetitors(clientId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState<NewCompetitor>({
    platform: 'instagram',
    username: '',
    display_name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newCompetitor.username.trim()) return;
    
    setIsSubmitting(true);
    const result = await addCompetitor({
      ...newCompetitor,
      profile_url: getProfileUrl(newCompetitor.platform, newCompetitor.username),
    });
    setIsSubmitting(false);
    
    if (result) {
      setNewCompetitor({ platform: 'instagram', username: '', display_name: '' });
      setIsDialogOpen(false);
    }
  };

  const groupedByPlatform = competitors.reduce((acc, comp) => {
    if (!acc[comp.platform]) {
      acc[comp.platform] = [];
    }
    acc[comp.platform].push(comp);
    return acc;
  }, {} as Record<CompetitorPlatform, Competitor[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Competencia</CardTitle>
              <CardDescription className="text-xs">
                Cuentas de competidores para comparar
              </CardDescription>
            </div>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Competidor</DialogTitle>
                  <DialogDescription>
                    Agrega una cuenta de redes sociales para comparar con tu contenido.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select 
                      value={newCompetitor.platform} 
                      onValueChange={(v) => setNewCompetitor(prev => ({ ...prev, platform: v as CompetitorPlatform }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              {p.icon}
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Usuario / Handle</Label>
                    <Input 
                      placeholder="@usuario"
                      value={newCompetitor.username}
                      onChange={(e) => setNewCompetitor(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre (opcional)</Label>
                    <Input 
                      placeholder="Nombre de la marca"
                      value={newCompetitor.display_name || ''}
                      onChange={(e) => setNewCompetitor(prev => ({ ...prev, display_name: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting || !newCompetitor.username.trim()}>
                    {isSubmitting ? 'Agregando...' : 'Agregar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {competitors.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay competidores configurados</p>
            {canEdit && (
              <p className="text-xs mt-1">Agrega cuentas para comparar contenido</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByPlatform).map(([platform, comps]) => {
              const platformInfo = getPlatformInfo(platform as CompetitorPlatform);
              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs gap-1 ${platformInfo.color}`}>
                      {platformInfo.icon}
                      {platformInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {comps.length} {comps.length === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {comps.map((comp) => (
                      <div 
                        key={comp.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">
                            {comp.display_name || comp.username}
                          </span>
                          {comp.display_name && (
                            <span className="text-xs text-muted-foreground truncate">
                              @{comp.username.replace('@', '')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                          >
                            <a 
                              href={comp.profile_url || getProfileUrl(comp.platform as CompetitorPlatform, comp.username)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          {canEdit && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar competidor?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará {comp.display_name || comp.username} de la lista de competidores.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCompetitor(comp.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
