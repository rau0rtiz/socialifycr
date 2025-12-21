import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Instagram, Facebook, Youtube } from 'lucide-react';

interface PlatformFollowers {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  followers: number;
  name?: string;
}

interface SocialFollowersSectionProps {
  platforms: PlatformFollowers[];
  isLoading: boolean;
  isLiveData: boolean;
}

const platformConfig = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    metric: 'seguidores',
    color: 'hsl(330, 81%, 60%)',
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-600',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    metric: 'Me gusta',
    color: 'hsl(217, 91%, 60%)',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600',
  },
  tiktok: {
    label: 'TikTok',
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    metric: 'seguidores',
    color: 'hsl(0, 0%, 0%)',
    bgClass: 'bg-foreground/10',
    textClass: 'text-foreground',
  },
  youtube: {
    label: 'YouTube',
    icon: Youtube,
    metric: 'suscriptores',
    color: 'hsl(0, 100%, 50%)',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600',
  },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('es-ES');
};

const LoadingSkeleton = () => (
  <Card className="h-full">
    <CardContent className="p-4 md:p-6 flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </CardContent>
  </Card>
);

export const SocialFollowersSection = ({
  platforms,
  isLoading,
  isLiveData,
}: SocialFollowersSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            Redes Sociales
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (platforms.length === 0) {
    return null; // Don't show section if no platforms connected
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base md:text-lg font-semibold text-foreground">
          Redes Sociales
        </h2>
        {isLiveData && (
          <Badge
            variant="outline"
            className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En vivo
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((platform) => {
          const config = platformConfig[platform.platform];
          const Icon = config.icon;

          return (
            <Card key={platform.platform} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6 flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${config.bgClass}`}
                >
                  <Icon className={`h-5 w-5 ${config.textClass}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {config.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(platform.followers)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {config.metric}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
