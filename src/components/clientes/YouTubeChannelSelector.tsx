import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Youtube, Users, Video, Crown, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface YouTubeChannel {
  id: string;
  name: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
  isOwned?: boolean;
}

interface YouTubeChannelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: YouTubeChannel[];
  onSelect: (channel: YouTubeChannel) => void;
  loading?: boolean;
}

export function YouTubeChannelSelector({
  open,
  onOpenChange,
  channels,
  onSelect,
  loading = false,
}: YouTubeChannelSelectorProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  const handleConfirm = () => {
    const selected = channels.find(c => c.id === selectedChannelId);
    if (selected) {
      onSelect(selected);
    }
  };

  const formatCount = (count?: string) => {
    if (!count) return '0';
    const num = parseInt(count, 10);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Selecciona un canal de YouTube
          </DialogTitle>
          <DialogDescription>
            Elige el canal que deseas conectar para obtener analytics.
          </DialogDescription>
        </DialogHeader>

        {channels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron canales de YouTube asociados a esta cuenta.
          </div>
        ) : (
          <RadioGroup
            value={selectedChannelId}
            onValueChange={setSelectedChannelId}
            className="space-y-3"
          >
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedChannelId === channel.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedChannelId(channel.id)}
              >
                <RadioGroupItem value={channel.id} id={channel.id} />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={channel.thumbnail} alt={channel.name} />
                  <AvatarFallback>
                    <Youtube className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <Label
                  htmlFor={channel.id}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-medium">
                    {channel.name}
                    {channel.isOwned !== undefined && (
                      <Badge 
                        variant={channel.isOwned ? "default" : "secondary"} 
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {channel.isOwned ? (
                          <><Crown className="h-2.5 w-2.5 mr-0.5" /> Tu canal</>
                        ) : (
                          <><Shield className="h-2.5 w-2.5 mr-0.5" /> Administras</>
                        )}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {formatCount(channel.subscriberCount)} suscriptores
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {formatCount(channel.videoCount)} videos
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedChannelId || loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? 'Conectando...' : 'Conectar canal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
