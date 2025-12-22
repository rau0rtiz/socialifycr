import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Youtube, Users, Video, Crown, Shield, Plus, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface YouTubeChannel {
  id: string;
  name: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
  isOwned?: boolean;
  type?: 'personal' | 'managed' | 'manual';
}

interface YouTubeChannelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: YouTubeChannel[];
  onSelect: (channel: YouTubeChannel) => void;
  loading?: boolean;
  message?: string;
}

export function YouTubeChannelSelector({
  open,
  onOpenChange,
  channels,
  onSelect,
  loading = false,
  message,
}: YouTubeChannelSelectorProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [manualChannelId, setManualChannelId] = useState('');
  const [manualChannelName, setManualChannelName] = useState('');
  const [activeTab, setActiveTab] = useState<string>(channels.length > 0 ? 'detected' : 'manual');

  const handleConfirm = () => {
    const selected = channels.find(c => c.id === selectedChannelId);
    if (selected) {
      onSelect(selected);
    }
  };

  const [manualError, setManualError] = useState('');

  const handleManualAdd = () => {
    if (manualChannelId.trim()) {
      // Extract channel ID from various URL formats
      let channelId = manualChannelId.trim();
      
      // Handle full URLs
      if (channelId.includes('youtube.com')) {
        // Format: youtube.com/channel/UC...
        const channelMatch = channelId.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
        if (channelMatch) {
          channelId = channelMatch[1];
        } else if (channelId.includes('/@')) {
          // Format: youtube.com/@handle - Can't resolve without API
          setManualError('Los handles (@usuario) no se pueden usar directamente. Ve a YouTube Studio y copia el Channel ID que empieza con "UC".');
          return;
        }
      }
      
      // Validate that we have a proper channel ID (should start with UC)
      if (!channelId.startsWith('UC') || channelId.length < 20) {
        setManualError('El Channel ID debe empezar con "UC" y tener al menos 24 caracteres. Encuéntralo en YouTube Studio → Configuración → Canal.');
        return;
      }
      
      setManualError('');
      onSelect({
        id: channelId,
        name: manualChannelName.trim() || `Canal ${channelId.slice(0, 8)}...`,
        isOwned: false,
        type: 'manual',
      });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Selecciona un canal de YouTube
          </DialogTitle>
          <DialogDescription>
            Elige un canal detectado o agrega manualmente el ID del canal.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detected" className="text-sm">
              Canales detectados ({channels.length})
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-sm">
              <Plus className="h-3 w-3 mr-1" />
              Agregar manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detected" className="mt-4">
            {message && (
              <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg mb-3">
                {message}
              </div>
            )}
            
            {channels.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground space-y-2">
                <p>No se encontraron canales de YouTube.</p>
                <p className="text-xs">
                  Si administras un canal de Brand Account, usa la pestaña "Agregar manual" 
                  o asegúrate de iniciar sesión con la cuenta correcta.
                </p>
              </div>
            ) : (
              <RadioGroup
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
                className="space-y-3 max-h-64 overflow-y-auto"
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
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
              <p className="font-medium">¿Cómo encontrar el Channel ID?</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Ve a <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">YouTube Studio <ExternalLink className="h-3 w-3" /></a></li>
                <li>Haz clic en Configuración → Canal → Información básica</li>
                <li>Copia el "ID del canal" (empieza con UC...)</li>
              </ol>
            </div>

            {manualError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {manualError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="channelId" className="text-sm">Channel ID *</Label>
                <Input
                  id="channelId"
                  placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                  value={manualChannelId}
                  onChange={(e) => {
                    setManualChannelId(e.target.value);
                    setManualError('');
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  El ID debe empezar con "UC" (ej: UCcNGyNwVzi9XghpojpadDWA)
                </p>
              </div>
              
              <div>
                <Label htmlFor="channelName" className="text-sm">Nombre del canal (opcional)</Label>
                <Input
                  id="channelName"
                  placeholder="Nombre para identificar el canal"
                  value={manualChannelName}
                  onChange={(e) => setManualChannelName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleManualAdd}
                disabled={!manualChannelId.trim() || loading}
                className="bg-red-500 hover:bg-red-600"
              >
                {loading ? 'Conectando...' : 'Conectar canal'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
