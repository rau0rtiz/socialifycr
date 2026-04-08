import { useState, useMemo, useEffect } from 'react';
import { useStories, Story } from '@/hooks/use-stories';
import { useSalesTracking, SaleInput } from '@/hooks/use-sales-tracking';
import { useDailyStoryTracker } from '@/hooks/use-daily-story-tracker';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ShoppingBag, Check, Play, Image as ImageIcon, Zap, Archive, Tag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface StoryStoreSalesProps {
  clientId: string;
}

export const StoryStoreSales = ({ clientId }: StoryStoreSalesProps) => {
  const { activeStories, archivedStories, isLoading } = useStories(clientId);
  const { addSale } = useSalesTracking(clientId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current user's profile name for default seller
  const { data: profileName } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return '';
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      return data?.full_name || '';
    },
    enabled: !!user?.id,
  });

  // Fetch all story sales with details
  const { data: soldStoryData = [] } = useQuery({
    queryKey: ['sold-story-ids', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('message_sales')
        .select('story_id, amount, currency, customer_name, sale_date, product, brand')
        .eq('client_id', clientId)
        .not('story_id', 'is', null);
      return (data || []) as { story_id: string; amount: number; currency: string; customer_name: string | null; sale_date: string; product: string | null; brand: string | null }[];
    },
    enabled: !!clientId,
  });
  const soldSet = new Set(soldStoryData.map(s => s.story_id));
  const soldMap = new Map(soldStoryData.map(s => [s.story_id, s]));

  // Filter unsold stories for active/archived tabs
  const unsoldActive = useMemo(() => activeStories.filter(s => !soldSet.has(s.storyId)), [activeStories, soldSet]);
  const unsoldArchived = useMemo(() => archivedStories.filter(s => !soldSet.has(s.storyId)), [archivedStories, soldSet]);

  // Sold stories (from both active + archived)
  const allStories = useMemo(() => [...activeStories, ...archivedStories], [activeStories, archivedStories]);
  const soldStories = useMemo(() => allStories.filter(s => soldSet.has(s.storyId)), [allStories, soldSet]);

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [amount, setAmount] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellerName, setSellerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const applyScannedData = (sd: { customer_name?: string | null; customer_phone?: string | null; brand?: string | null; amount?: number | null; notes?: string | null } | null) => {
    if (!sd) return;
    if (sd.customer_name) setCustomerName(sd.customer_name);
    if (sd.customer_phone) setCustomerPhone(sd.customer_phone);
    if (sd.brand) setBrand(sd.brand);
    if (sd.amount) setAmount(String(sd.amount));
    if (sd.notes) setNotes(sd.notes);
    if (sd.customer_name || sd.brand || sd.amount) {
      toast.info('Datos pre-llenados con IA ✨', { description: 'Revisa y ajusta antes de confirmar' });
    }
  };

  const openSaleDialog = async (story: Story) => {
    setSelectedStory(story);
    setCustomerName('');
    setCustomerPhone('');
    setBrand('');
    setAmount('');
    setSaleDate(format(new Date(), 'yyyy-MM-dd'));
    setSellerName(profileName || '');
    setNotes('');
    setDialogOpen(true);

    // If archived story has scanned data, use it immediately
    if (story.scannedData) {
      applyScannedData(story.scannedData);
      return;
    }

    // For active stories (or archived without scan), scan on-demand
    const imageUrl = story.mediaUrl || story.thumbnailUrl;
    if (!imageUrl) return;

    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-story-text', {
        body: { imageUrl },
      });
      if (!error && data?.scannedData) {
        applyScannedData(data.scannedData);
      }
    } catch {
      // non-critical
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStory || !amount || Number(amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (!customerName.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }
    setSubmitting(true);
    try {
      const saleInput: SaleInput = {
        sale_date: saleDate,
        amount: Number(amount),
        currency: 'CRC',
        source: 'story',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        brand: brand.trim() || undefined,
        closer_name: sellerName.trim() || undefined,
        notes: notes || undefined,
        story_id: selectedStory.storyId,
      };
      await addSale.mutateAsync(saleInput);

      // Auto-sync: upsert daily_story_tracker for this date
      try {
        const { data: existing } = await supabase
          .from('daily_story_tracker' as any)
          .select('id, daily_revenue')
          .eq('client_id', clientId)
          .eq('track_date', saleDate)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('daily_story_tracker' as any)
            .update({
              daily_revenue: Number((existing as any).daily_revenue) + Number(amount),
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', (existing as any).id);
        } else if (user) {
          await supabase
            .from('daily_story_tracker' as any)
            .insert({
              client_id: clientId,
              track_date: saleDate,
              stories_count: 0,
              daily_revenue: Number(amount),
              currency: 'CRC',
              created_by: user.id,
            } as any);
        }
      } catch {
        // non-critical
      }

      toast.success('¡Venta registrada!');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sold-story-ids', clientId] });
      queryClient.invalidateQueries({ queryKey: ['sales', clientId] });
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar venta');
    } finally {
      setSubmitting(false);
    }
  };

  const StoryCard = ({ story, isSold }: { story: Story; isSold: boolean }) => {
    const isVideo = story.mediaType === 'VIDEO';
    const thumb = story.thumbnailUrl || story.mediaUrl;
    const hours = Math.floor((Date.now() - parseISO(story.timestamp).getTime()) / 3600000);
    const timeLabel = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;

    return (
      <div
        onClick={() => !isSold && openSaleDialog(story)}
        className={cn(
          'relative flex-shrink-0 w-full sm:w-[100px] aspect-[9/16] sm:h-[178px] rounded-xl overflow-hidden border-2 transition-all',
          isSold
            ? 'border-green-500/50 opacity-70 cursor-default'
            : 'border-border hover:border-primary/50 cursor-pointer hover:scale-[1.03]'
        )}
      >
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {isVideo ? <Play className="h-6 w-6 text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
          </div>
        )}

        <span className="absolute top-1 right-1 text-white/70 text-[8px] font-medium drop-shadow-sm">{timeLabel}</span>

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
            <div className="bg-green-500 rounded-full p-1.5">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {/* Tap to sell overlay */}
        {!isSold && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
            <div className="flex items-center gap-1 text-white text-[10px] font-medium">
              <ShoppingBag className="h-3 w-3" />
              Vender
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStories = (stories: Story[]) => {
    if (stories.length === 0) {
      return (
        <div className="flex items-center justify-center h-[178px] text-sm text-muted-foreground">
          No hay historias disponibles
        </div>
      );
    }
    return (
      <ScrollArea className="w-full max-h-[580px]">
        <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,100px)] gap-2 sm:gap-3 pb-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} isSold={soldSet.has(story.storyId)} />
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderSoldStories = () => {
    if (soldStories.length === 0) {
      return (
        <div className="flex items-center justify-center h-[178px] text-sm text-muted-foreground">
          No hay historias vendidas
        </div>
      );
    }
    return (
      <ScrollArea className="w-full max-h-[580px]">
        <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,100px)] gap-2 sm:gap-3 pb-3">
          {soldStories.map((story) => {
            const sale = soldMap.get(story.storyId);
            const isVideo = story.mediaType === 'VIDEO';
            const thumb = story.thumbnailUrl || story.mediaUrl;
            const currSymbol = sale?.currency === 'CRC' ? '₡' : '$';
            const hours = Math.floor((Date.now() - parseISO(story.timestamp).getTime()) / 3600000);
            const timeLabel = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
            return (
              <div key={story.id} className="relative flex-shrink-0 w-full sm:w-[100px] aspect-[9/16] sm:h-[178px] rounded-xl overflow-hidden border-2 border-green-500/50">
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {isVideo ? <Play className="h-6 w-6 text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                  </div>
                )}
                <span className="absolute top-1 right-1 text-white/70 text-[8px] font-medium drop-shadow-sm z-10">{timeLabel}</span>
                <div className="absolute inset-0 bg-green-500/20" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <p className="text-white text-[11px] font-bold">{currSymbol}{sale?.amount?.toLocaleString()}</p>
                  {sale?.brand && <p className="text-white/70 text-[9px] truncate">{sale.brand}</p>}
                  {sale?.customer_name && <p className="text-white/70 text-[9px] truncate">{sale.customer_name}</p>}
                </div>
                <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Ventas por Historia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-[100px] h-[178px] rounded-xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="activas">
              <TabsList className="mb-3">
                <TabsTrigger value="activas" className="gap-1.5 text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  Activas ({unsoldActive.length})
                </TabsTrigger>
                <TabsTrigger value="archivadas" className="gap-1.5 text-xs">
                  <Archive className="h-3.5 w-3.5" />
                  Archivadas ({unsoldArchived.length})
                </TabsTrigger>
                <TabsTrigger value="vendidas" className="gap-1.5 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  Vendidas ({soldStories.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activas">
                {renderStories(unsoldActive)}
              </TabsContent>
              <TabsContent value="archivadas">
                {renderStories(unsoldArchived)}
              </TabsContent>
              <TabsContent value="vendidas">
                {renderSoldStories()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Sale registration dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <ShoppingBag className="h-4 w-4" />
              Registrar Venta
              {scanning && (
                <Badge variant="secondary" className="ml-2 gap-1 text-[10px] animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  Escaneando...
                </Badge>
              )}
              {!scanning && customerName && (
                <Badge variant="secondary" className="ml-2 gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" />
                  Auto-escaneado
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedStory && (
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Story preview */}
              <div className="relative flex-shrink-0 w-full h-[280px] md:w-[340px] md:h-[604px] rounded-xl overflow-hidden border bg-muted">
                {(selectedStory.thumbnailUrl || selectedStory.mediaUrl) ? (
                  <img
                    src={selectedStory.thumbnailUrl || selectedStory.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {scanning && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 rounded-xl">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/30 border-t-white" />
                    <span className="text-white text-sm font-medium">Escaneando con IA…</span>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="flex-1 flex flex-col gap-3 justify-between">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Cliente *</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nombre del cliente"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="8888-8888"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Marca</Label>
                    <Input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Nombre de la marca"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Monto (₡)</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="15000"
                        className="h-9 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <Input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Vendedor</Label>
                    <Input
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="Nombre del vendedor"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Notas adicionales</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Detalles adicionales"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !amount || !customerName.trim()}
                  className="w-full"
                >
                  {submitting ? 'Registrando...' : 'Registrar Venta'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
