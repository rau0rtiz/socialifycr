import { useSocialFollowers } from '@/hooks/use-social-followers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Instagram, Facebook, Youtube, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';

interface SocialPerformanceReportProps {
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
  tiktok: 'from-foreground to-muted-foreground',
};

export const SocialPerformanceReport = ({ clientId }: SocialPerformanceReportProps) => {
  const { platforms, isLoading: socialLoading } = useSocialFollowers(clientId);

  const { data: contentStats, isLoading: contentLoading } = useQuery({
    queryKey: ['social-content-stats', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { count: totalPosts } = await supabase
        .from('content_metadata')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const { data: recentContent } = await supabase
        .from('content_metadata')
        .select('first_48h_views, first_48h_likes, first_48h_shares, first_48h_comments, first_48h_saves, first_48h_captured_at')
        .eq('client_id', clientId)
        .not('first_48h_captured_at', 'is', null)
        .gte('first_48h_captured_at', thirtyDaysAgo)
        .order('first_48h_captured_at', { ascending: false });

      const posts = recentContent || [];
      const totalViews = posts.reduce((s, p) => s + (p.first_48h_views || 0), 0);
      const totalLikes = posts.reduce((s, p) => s + (p.first_48h_likes || 0), 0);
      const totalShares = posts.reduce((s, p) => s + (p.first_48h_shares || 0), 0);
      const totalComments = posts.reduce((s, p) => s + (p.first_48h_comments || 0), 0);
      const totalSaves = posts.reduce((s, p) => s + (p.first_48h_saves || 0), 0);

      return {
        totalPosts: totalPosts || 0,
        recentPosts: posts.length,
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
        totalSaves,
        avgViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
        avgLikes: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
      };
    },
    enabled: !!clientId,
  });

  const isLoading = socialLoading || contentLoading;

  // Bar chart data for content metrics
  const metricsBarData = contentStats ? [
    { name: 'Vistas', valor: contentStats.totalViews, fill: 'hsl(var(--chart-1))' },
    { name: 'Likes', valor: contentStats.totalLikes, fill: 'hsl(var(--chart-2))' },
    { name: 'Comentarios', valor: contentStats.totalComments, fill: 'hsl(var(--chart-3))' },
    { name: 'Compartidos', valor: contentStats.totalShares, fill: 'hsl(var(--chart-4))' },
    { name: 'Guardados', valor: contentStats.totalSaves, fill: 'hsl(var(--chart-5))' },
  ] : [];

  // Radial gauge data for averages
  const maxAvg = Math.max(contentStats?.avgViews || 1, contentStats?.avgLikes || 1);
  const radialData = contentStats ? [
    { name: 'Prom. Vistas', value: contentStats.avgViews, fill: 'hsl(var(--chart-1))' },
    { name: 'Prom. Likes', value: contentStats.avgLikes, fill: 'hsl(var(--chart-2))' },
  ] : [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Rendimiento Social</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <>
          {/* Platform Follower Cards */}
          {platforms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {platforms.map((p) => {
                const Icon = platformIcons[p.platform] || Users;
                const gradient = platformGradients[p.platform] || 'from-primary to-primary/70';
                return (
                  <Card key={p.platform} className="relative overflow-hidden border-0 shadow-sm">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.08]`} />
                    <CardContent className="relative pt-6 pb-5">
                      <div className={`absolute top-4 right-4 p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white opacity-80`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{p.platform}</p>
                      <p className="text-3xl font-bold text-foreground tracking-tight">
                        {p.followers.toLocaleString('es-CR')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">seguidores</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {platforms.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="font-medium">No hay plataformas conectadas</p>
                <p className="text-xs mt-1">Conecta Meta o YouTube para ver métricas</p>
              </CardContent>
            </Card>
          )}

          {/* Content Performance Charts */}
          {contentStats && contentStats.recentPosts > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Horizontal Bar Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Métricas Totales (últimos 30 días)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{contentStats.recentPosts} publicaciones analizadas</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={metricsBarData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} className="text-muted-foreground" />
                      <Tooltip formatter={(value: number) => [value.toLocaleString('es-CR'), '']} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={20}>
                        {metricsBarData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radial Gauges for Averages */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Promedios</CardTitle>
                  <p className="text-xs text-muted-foreground">por publicación</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="90%"
                      data={radialData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={8}
                        background={{ fill: 'hsl(var(--muted))' }}
                      />
                      <Tooltip formatter={(value: number) => [value.toLocaleString('es-CR'), '']} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="flex items-center gap-1.5 justify-center mb-0.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                        <span className="text-xs text-muted-foreground">Vistas</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{contentStats.avgViews.toLocaleString('es-CR')}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 justify-center mb-0.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                        <span className="text-xs text-muted-foreground">Likes</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{contentStats.avgLikes.toLocaleString('es-CR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {contentStats && contentStats.recentPosts === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="font-medium">No hay datos de contenido en los últimos 30 días</p>
                <p className="text-xs mt-1">Clasifica tus publicaciones en la sección de Contenido para ver métricas aquí</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// Need to import Cell for the BarChart coloring
import { Cell } from 'recharts';
