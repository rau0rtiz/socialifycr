import { useState, useMemo } from 'react';
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
import { ShoppingBag, Check, Play, Image as ImageIcon, Zap, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

  // Fetch all story_ids that already have sales linked
  const { data: soldStoryIds = [] } = useQuery({
    queryKey: ['sold-story-ids', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('message_sales')
        .select('story_id')
        .eq('client_id', clientId)
        .not('story_id', 'is', null);
      return (data || []).map((r: any) => r.story_id as string);
    },
    enabled: !!clientId,
  });
  const soldSet = new Set(soldStoryIds);

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [product, setProduct] = useState('Pieza única');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openSaleDialog = (story: Story) => {
    setSelectedStory(story);
    setProduct('Pieza única');
    setAmount('');
    setCustomerName('');
    setSaleDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedStory || !amount || Number(amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setSubmitting(true);
    try {
      const saleInput: SaleInput = {
        sale_date: saleDate,
        amount: Number(amount),
        currency: 'CRC',
        source: 'story',
        product,
        customer_name: customerName || undefined,
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
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar venta');
    } finally {
      setSubmitting(false);
    }
  };

  const StoryCard = ({ story, isSold }: { story: Story; isSold: boolean }) => {
    const isVideo = story.mediaType === 'VIDEO';
    const thumb = story.thumbnailUrl || story.mediaUrl;

    return (
      <div
        onClick={() => !isSold && openSaleDialog(story)}
        className={cn(
          'relative flex-shrink-0 w-[100px] h-[178px] rounded-xl overflow-hidden border-2 transition-all',
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
        <div className="grid grid-cols-[repeat(auto-fill,100px)] gap-3 pb-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} isSold={soldSet.has(story.storyId)} />
          ))}
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
                  Activas ({activeStories.length})
                </TabsTrigger>
                <TabsTrigger value="archivadas" className="gap-1.5 text-xs">
                  <Archive className="h-3.5 w-3.5" />
                  Archivadas ({archivedStories.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activas">
                {renderStories(activeStories)}
              </TabsContent>
              <TabsContent value="archivadas">
                {renderStories(archivedStories)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Sale registration dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Registrar Venta
            </DialogTitle>
          </DialogHeader>

          {selectedStory && (
            <div className="flex gap-6">
              {/* Story preview - left side */}
              <div className="flex-shrink-0 w-[340px] h-[604px] rounded-xl overflow-hidden border bg-muted">
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
              </div>

              {/* Form - right side */}
              <div className="flex-1 flex flex-col gap-3 justify-between">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Producto</Label>
                    <Input
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="Pieza única"
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
                    <Label className="text-xs">Cliente (opcional)</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Notas (opcional)</Label>
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
                  disabled={submitting || !amount}
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
