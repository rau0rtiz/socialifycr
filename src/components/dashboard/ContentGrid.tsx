import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentPost } from '@/data/mockData';
import { Image, Video, Layers, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentGridProps {
  data: ContentPost[];
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Video,
  carousel: Layers,
  story: Clock,
};

const statusConfig: Record<string, { label: string; class: string }> = {
  published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-600' },
  scheduled: { label: 'Programado', class: 'bg-violet-500/10 text-violet-600' },
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
};

const networkColors: Record<string, string> = {
  instagram: 'text-pink-500',
  facebook: 'text-blue-500',
  tiktok: 'text-foreground',
  linkedin: 'text-sky-600',
};

export const ContentGrid = ({ data }: ContentGridProps) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm md:text-base font-medium">Contenido Reciente</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
          {data.map((post) => {
            const TypeIcon = typeIcons[post.type] || Image;
            
            return (
              <div 
                key={post.id}
                className="group relative rounded-lg border border-border bg-muted/30 p-2 md:p-4 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-2 md:mb-3">
                  <TypeIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                </div>
                
                {/* Content info */}
                <div className="space-y-1 md:space-y-2">
                  <p className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                    {post.title}
                  </p>
                  
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-[10px] md:text-xs font-medium capitalize", networkColors[post.network])}>
                      {post.network}
                    </span>
                    <Badge variant="secondary" className={cn("text-[10px] md:text-xs px-1 md:px-2", statusConfig[post.status].class)}>
                      <span className="hidden sm:inline">{statusConfig[post.status].label}</span>
                      <span className="sm:hidden">{statusConfig[post.status].label.slice(0, 3)}</span>
                    </Badge>
                  </div>
                  
                  {post.engagement > 0 && (
                    <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                      {post.engagement.toLocaleString()} interacciones
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
