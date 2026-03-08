import { useSocialFollowers } from '@/hooks/use-social-followers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Instagram, Facebook, Youtube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface SocialPerformanceReportProps {
  clientId: string;
}

const platformIcons: Record<string, typeof Users> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-500',
  facebook: 'from-blue-600 to-blue-400',
  youtube: 'from-red-600 to-red-400',
  tiktok: 'from-foreground to-muted-foreground',
};

export const SocialPerformanceReport = ({ clientId }: SocialPerformanceReportProps) => {
  const { platforms, isLoading: socialLoading } = useSocialFollowers(clientId);

  // Get content stats for the last 30 days
  const { data: contentStats, isLoading: contentLoading } = useQuery({
    queryKey: ['social-content-stats', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Count content metadata entries
      const { count: totalPosts } = await supabase
        .from('content_metadata')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      // Get recent content with 48h metrics
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Rendimiento Social</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* Followers by platform */}
          {platforms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {platforms.map((p) => {
                const Icon = platformIcons[p.platform] || Users;
                const gradient = platformColors[p.platform] || 'from-primary to-primary/70';
                return (
                  <Card key={p.platform} className="overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground capitalize">{p.platform}</p>
                          <p className="text-xl font-bold text-foreground">
                            {p.followers.toLocaleString('es-CR')}
                          </p>
                          <p className="text-xs text-muted-foreground">seguidores</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {platforms.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay plataformas conectadas</p>
                <p className="text-xs mt-1">Conecta Meta o YouTube para ver métricas</p>
              </CardContent>
            </Card>
          )}

          {/* Content performance (last 30 days) */}
          {contentStats && contentStats.recentPosts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rendimiento de Contenido (últimos 30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <MetricBox label="Publicaciones" value={contentStats.recentPosts} />
                  <MetricBox label="Vistas totales" value={contentStats.totalViews} />
                  <MetricBox label="Likes totales" value={contentStats.totalLikes} />
                  <MetricBox label="Comentarios" value={contentStats.totalComments} />
                  <MetricBox label="Compartidos" value={contentStats.totalShares} />
                </div>

                <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <MetricBox label="Promedio de vistas" value={contentStats.avgViews} subtitle="por publicación" />
                  <MetricBox label="Promedio de likes" value={contentStats.avgLikes} subtitle="por publicación" />
                </div>
              </CardContent>
            </Card>
          )}

          {contentStats && contentStats.recentPosts === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No hay datos de contenido en los últimos 30 días</p>
                <p className="text-xs mt-1">Clasifica tus publicaciones en la sección de Contenido para ver métricas aquí</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const MetricBox = ({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-foreground">{value.toLocaleString('es-CR')}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
  </div>
);
