import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useContentData } from '@/hooks/use-content-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Instagram, Facebook, Youtube, Eye, Heart, MessageCircle, Share2, Bookmark, BarChart3, TrendingUp, PlayCircle } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie } from 'recharts';

interface SocialContentOverviewProps {
  clientId: string;
}

const platformIcons: Record<string, typeof Users> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformGradients: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-500',
  facebook: 'from-blue-600 to-blue-400',
  youtube: 'from-red-600 to-red-400',
};

const TikTokIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('es-CR');
};

export const SocialContentOverview = ({ clientId }: SocialContentOverviewProps) => {
  const { platforms, isLoading: socialLoading, isLiveData: socialLive } = useSocialFollowers(clientId);
  const { content, isLoading: contentLoading, isLiveData: contentLive } = useContentData(clientId, 100);

  const isLoading = socialLoading || contentLoading;
  const isLiveData = socialLive || contentLive;

  // Aggregate content metrics
  const totalViews = content.reduce((s, p) => s + (p.views || 0), 0);
  const totalLikes = content.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = content.reduce((s, p) => s + (p.comments || 0), 0);
  const totalShares = content.reduce((s, p) => s + (p.shares || 0), 0);
  const totalSaves = content.reduce((s, p) => s + (p.saves || 0), 0);
  const totalEngagement = content.reduce((s, p) => s + (p.engagement || 0), 0);

  // Content by platform
  const byPlatform: Record<string, number> = {};
  content.forEach(p => {
    byPlatform[p.network] = (byPlatform[p.network] || 0) + 1;
  });

  const platformPieData = Object.entries(byPlatform).map(([platform, count]) => ({
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    value: count,
    fill: platform === 'instagram' ? 'hsl(var(--chart-1))' 
        : platform === 'youtube' ? 'hsl(var(--chart-2))' 
        : platform === 'facebook' ? 'hsl(var(--chart-3))' 
        : 'hsl(var(--chart-4))',
  }));

  // Content by type
  const byType: Record<string, number> = {};
  content.forEach(p => {
    const type = p.type || 'post';
    byType[type] = (byType[type] || 0) + 1;
  });

  const typeLabels: Record<string, string> = {
    reel: 'Reel',
    video: 'Video',
    carousel: 'Carrusel',
    post: 'Post',
    story: 'Historia',
  };

  const typeBarData = Object.entries(byType)
    .map(([type, count]) => ({
      name: typeLabels[type] || type,
      cantidad: count,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Engagement metrics bar data
  const metricsData = [
    { name: 'Vistas', valor: totalViews, fill: 'hsl(var(--chart-1))' },
    { name: 'Likes', valor: totalLikes, fill: 'hsl(var(--chart-2))' },
    { name: 'Comentarios', valor: totalComments, fill: 'hsl(var(--chart-3))' },
    { name: 'Compartidos', valor: totalShares, fill: 'hsl(var(--chart-4))' },
    { name: 'Guardados', valor: totalSaves, fill: 'hsl(var(--chart-5))' },
  ].filter(m => m.valor > 0);

  const totalFollowers = platforms.reduce((s, p) => s + p.followers, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const hasData = platforms.length > 0 || content.length > 0;

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No hay datos disponibles</p>
          <p className="text-xs mt-1">Conecta una plataforma o espera a que se carguen los datos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Resumen de Redes y Contenido</h2>
        {isLiveData && (
          <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600 px-1.5 py-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En vivo
          </Badge>
        )}
      </div>

      {/* Top KPI row: followers per platform + total engagement */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {platforms.map((p) => {
          const Icon = platformIcons[p.platform] || Users;
          const gradient = platformGradients[p.platform] || 'from-primary to-primary/70';
          return (
            <Card key={p.platform} className="relative overflow-hidden border-0 shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.07]`} />
              <CardContent className="relative p-4">
                <div className={`absolute top-3 right-3 p-2 rounded-lg bg-gradient-to-br ${gradient} text-white opacity-80`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{p.platform}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatNumber(p.followers)}</p>
                <p className="text-xs text-muted-foreground">seguidores</p>
              </CardContent>
            </Card>
          );
        })}

        {/* Total content card */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70 opacity-[0.07]" />
          <CardContent className="relative p-4">
            <div className="absolute top-3 right-3 p-2 rounded-lg bg-primary/15">
              <PlayCircle className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contenido</p>
            <p className="text-2xl font-bold text-foreground mt-1">{content.length}</p>
            <p className="text-xs text-muted-foreground">publicaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement summary row */}
      {content.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: Eye, label: 'Vistas', value: totalViews },
            { icon: Heart, label: 'Likes', value: totalLikes },
            { icon: MessageCircle, label: 'Comentarios', value: totalComments },
            { icon: Share2, label: 'Compartidos', value: totalShares },
            { icon: Bookmark, label: 'Guardados', value: totalSaves },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-base font-semibold text-foreground">{formatNumber(value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {content.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Engagement metrics bar chart */}
          {metricsData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Engagement Acumulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricsData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} className="text-muted-foreground" />
                    <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18}>
                      {metricsData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Content distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Distribución de Contenido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* Pie: by platform */}
                {platformPieData.length > 1 && (
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Por plataforma</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {platformPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} posts`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-1">
                      {platformPieData.map(e => (
                        <div key={e.name} className="flex items-center gap-1 text-[11px]">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.fill }} />
                          <span className="text-muted-foreground">{e.name}</span>
                          <span className="font-medium text-foreground">{e.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bar: by type */}
                <div className={platformPieData.length > 1 ? 'flex-1' : 'w-full'}>
                  <p className="text-xs text-muted-foreground mb-2 text-center">Por tipo</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={typeBarData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <Tooltip formatter={(value: number) => [`${value}`, 'Posts']} />
                      <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
