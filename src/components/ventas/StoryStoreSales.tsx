import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { ShoppingBag, Check, Play, Image as ImageIcon, Zap, Archive, Tag, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { upsertCustomerContact, useCustomerContacts, CustomerAddress, CustomerContact } from '@/hooks/use-customer-contacts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única'];

interface StoryStoreSalesProps {
  clientId: string;
}

export const StoryStoreSales = ({ clientId }: StoryStoreSalesProps) => {
  const { activeStories, archivedStories, allArchivedStories, isLoading, isLoadingAllArchived, hasMoreArchived, fetchAllArchived } = useStories(clientId);
  const [allArchivedDialogOpen, setAllArchivedDialogOpen] = useState(false);
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

  // Fetch all story sales with details (including status and id)
  const { data: soldStoryData = [] } = useQuery({
    queryKey: ['sold-story-ids', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('message_sales')
        .select('story_id, amount, currency, customer_name, sale_date, product, brand, status, id')
        .eq('client_id', clientId)
        .not('story_id', 'is', null);
      return (data || []) as { story_id: string; amount: number; currency: string; customer_name: string | null; sale_date: string; product: string | null; brand: string | null; status: string; id: string }[];
    },
    enabled: !!clientId,
  });

  // Separate sold (completed) and reserved sets
  const soldSet = new Set(soldStoryData.filter(s => s.status === 'completed').map(s => s.story_id));
  const reservedSet = new Set(soldStoryData.filter(s => s.status === 'reserved').map(s => s.story_id));
  const allTakenSet = new Set(soldStoryData.map(s => s.story_id));
  const soldMap = new Map(soldStoryData.filter(s => s.status === 'completed').map(s => [s.story_id, s]));
  const reservedMap = new Map(soldStoryData.filter(s => s.status === 'reserved').map(s => [s.story_id, s]));

  // Filter unsold stories for active/archived tabs (exclude both sold and reserved)
  const unsoldActive = useMemo(() => activeStories.filter(s => !allTakenSet.has(s.storyId)), [activeStories, allTakenSet]);
  const unsoldArchived = useMemo(() => archivedStories.filter(s => !allTakenSet.has(s.storyId)), [archivedStories, allTakenSet]);

  // Sold stories (completed)
  const allStories = useMemo(() => [...activeStories, ...archivedStories], [activeStories, archivedStories]);
  const soldStories = useMemo(() => allStories.filter(s => soldSet.has(s.storyId)), [allStories, soldSet]);

  // Reserved stories
  const reservedStories = useMemo(() => allStories.filter(s => reservedSet.has(s.storyId)), [allStories, reservedSet]);

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [garmentSize, setGarmentSize] = useState('');
  const [amount, setAmount] = useState('');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellerName, setSellerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [confirmingReservation, setConfirmingReservation] = useState<string | null>(null);
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const { contacts: customerContacts } = useCustomerContacts(clientId);

  const applyScannedData = (sd: { customer_name?: string | null; customer_phone?: string | null; brand?: string | null; garment_type?: string | null; amount?: number | null; notes?: string | null } | null) => {
    if (!sd) return;
    if (sd.customer_name) setCustomerName(sd.customer_name);
    if (sd.customer_phone) setCustomerPhone(sd.customer_phone);
    if (sd.brand) setBrand(sd.brand);
    if (sd.garment_type) setGarmentType(sd.garment_type);
    if (sd.amount) setAmount(String(sd.amount));
    if (sd.notes) setNotes(sd.notes);
    if (sd.customer_name || sd.brand || sd.amount || sd.garment_type) {
      toast.info('Datos pre-llenados con IA ✨', { description: 'Revisa y ajusta antes de confirmar' });
    }
  };

  const openSaleDialog = async (story: Story) => {
    setSelectedStory(story);
    setCustomerName('');
    setCustomerPhone('');
    setBrand('');
    setGarmentType('');
    setGarmentSize('');
    setAmount('');
    setSaleDate(format(new Date(), 'yyyy-MM-dd'));
    setSellerName(profileName || '');
    setNotes('');
    setDeliveryAddress('');
    setSavedAddresses([]);
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

  const handleSubmit = async (asReserved: boolean = false) => {
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
        product: garmentType.trim() || undefined,
        garment_size: garmentSize || undefined,
        closer_name: sellerName.trim() || undefined,
        notes: notes || undefined,
        story_id: selectedStory.storyId,
        status: asReserved ? 'reserved' as any : 'completed',
      };
      await addSale.mutateAsync(saleInput);

      // Upsert customer contact (CRM) — only on completed sales to avoid duplicates from reservations
      if (!asReserved) {
        try {
          const addr: CustomerAddress | null = deliveryAddress.trim()
            ? { label: 'Entrega', address_line_1: deliveryAddress.trim() }
            : null;
          await upsertCustomerContact({
            clientId,
            fullName: customerName.trim(),
            phone: customerPhone.trim() || null,
            garmentSize: garmentSize || null,
            brand: brand.trim() || null,
            address: addr,
            isNewSale: true,
          });
        } catch {
          // non-critical
        }
      }

      // Auto-sync: upsert daily_story_tracker for this date (only for completed sales)
      if (!asReserved) {
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
      }

      toast.success(asReserved ? '¡Apartado registrado!' : '¡Venta registrada!');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sold-story-ids', clientId] });
      queryClient.invalidateQueries({ queryKey: ['sales', clientId] });
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReservation = async (saleId: string) => {
    setConfirmingReservation(saleId);
    try {
      const { error } = await supabase
        .from('message_sales')
        .update({ status: 'completed' } as any)
        .eq('id', saleId);
      if (error) throw error;
      toast.success('¡Apartado confirmado como venta!');
      queryClient.invalidateQueries({ queryKey: ['sold-story-ids', clientId] });
      queryClient.invalidateQueries({ queryKey: ['message-sales', clientId] });
    } catch (err: any) {
      toast.error(err?.message || 'Error al confirmar');
    } finally {
      setConfirmingReservation(null);
    }
  };

  const getStoryPreviewProps = (story: Story) => {
    return {
      previewSrc: story.thumbnailUrl || story.mediaUrl,
      fallbackSrc: story.mediaUrl || story.thumbnailUrl,
      previewClassName: 'absolute inset-0 block h-full w-full object-cover object-center',
      containerClassName: 'bg-muted',
    };
  };

  const StoryImage = ({
    src,
    fallbackSrc,
    className,
    isVideo,
    iconClassName = 'h-6 w-6',
  }: {
    src?: string;
    fallbackSrc?: string;
    className: string;
    isVideo: boolean;
    iconClassName?: string;
  }) => {
    const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc || '');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setCurrentSrc(src || fallbackSrc || '');
      setFailed(false);
    }, [src, fallbackSrc]);

    const handleError = () => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }

      setFailed(true);
    };

    if (!currentSrc || failed) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {isVideo ? (
            <Play className={cn(iconClassName, 'text-muted-foreground')} />
          ) : (
            <ImageIcon className={cn(iconClassName, 'text-muted-foreground')} />
          )}
        </div>
      );
    }

    return (
      <img
        src={currentSrc}
        alt=""
        className={className}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={handleError}
      />
    );
  };

  const StoryDialogPreview = ({ story }: { story: Story }) => {
    const [videoFailed, setVideoFailed] = useState(false);

    useEffect(() => {
      setVideoFailed(false);
    }, [story.id, story.mediaUrl, story.thumbnailUrl]);

    if (story.mediaType === 'VIDEO' && story.mediaUrl && !videoFailed) {
      return (
        <video
          src={story.mediaUrl}
          poster={story.thumbnailUrl || undefined}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onError={() => setVideoFailed(true)}
        />
      );
    }

    return (
      <StoryImage
        src={story.mediaUrl || story.thumbnailUrl}
        fallbackSrc={story.thumbnailUrl || story.mediaUrl}
        className="w-full h-full object-contain"
        isVideo={story.mediaType === 'VIDEO'}
        iconClassName="h-8 w-8"
      />
    );
  };

  const storyGridClassName = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 sm:gap-3 pb-3';

  const StoryCard = ({ story, isSold, isReserved }: { story: Story; isSold: boolean; isReserved: boolean }) => {
    const hours = Math.floor((Date.now() - parseISO(story.timestamp).getTime()) / 3600000);
    const timeLabel = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
    const isVideo = story.mediaType === 'VIDEO';
    const { previewSrc, fallbackSrc, previewClassName, containerClassName } = getStoryPreviewProps(story);
    const isTaken = isSold || isReserved;

    return (
      <div
        onClick={() => !isTaken && openSaleDialog(story)}
        className={cn(
          'group relative w-full aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all',
          containerClassName,
          isSold
            ? 'border-green-500/50 opacity-70 cursor-default'
            : isReserved
            ? 'border-amber-500/50 opacity-80 cursor-default'
            : 'border-border hover:border-muted-foreground/30 cursor-pointer hover:scale-[1.02]'
        )}
      >
        {previewSrc ? (
          <StoryImage src={previewSrc} fallbackSrc={fallbackSrc} className={previewClassName} isVideo={isVideo} />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {isVideo ? <Play className="h-5 w-5 text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute top-1 right-1 text-white/80 text-[7px] sm:text-[8px] font-medium drop-shadow-sm">{timeLabel}</span>

        {isSold && (
          <div className="absolute inset-0 bg-green-500/25 flex items-center justify-center">
            <div className="bg-green-500 rounded-full p-1.5">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        )}

        {isReserved && (
          <div className="absolute inset-0 bg-amber-500/25 flex items-center justify-center">
            <div className="bg-amber-500 rounded-full p-1.5">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        )}

        {!isTaken && (
          <div className="absolute bottom-0 inset-x-0 p-1.5 pt-6">
            <div className="inline-flex items-center gap-1 text-white text-[9px] font-medium bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
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
      <ScrollArea className="w-full h-[500px] sm:h-[580px]">
        <div className={storyGridClassName}>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} isSold={soldSet.has(story.storyId)} isReserved={reservedSet.has(story.storyId)} />
          ))}
        </div>
        <ScrollBar orientation="vertical" />
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
      <ScrollArea className="w-full h-[500px] sm:h-[580px]">
        <div className={storyGridClassName}>
          {soldStories.map((story) => {
            const sale = soldMap.get(story.storyId);
            const currSymbol = sale?.currency === 'CRC' ? '₡' : '$';
            const hours = Math.floor((Date.now() - parseISO(story.timestamp).getTime()) / 3600000);
            const timeLabel = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
            const isVideo = story.mediaType === 'VIDEO';
            const { previewSrc, fallbackSrc, previewClassName, containerClassName } = getStoryPreviewProps(story);

            return (
              <div
                key={story.id}
                className={cn(
                  'relative w-full aspect-[9/16] rounded-xl overflow-hidden border-2 border-green-500/50',
                  containerClassName
                )}
              >
                {previewSrc ? (
                  <StoryImage src={previewSrc} fallbackSrc={fallbackSrc} className={previewClassName} isVideo={isVideo} />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {isVideo ? <Play className="h-5 w-5 text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <span className="absolute top-1 right-1 text-white/80 text-[7px] sm:text-[8px] font-medium drop-shadow-sm z-10">{timeLabel}</span>
                <div className="absolute bottom-0 inset-x-0 p-1.5 pt-7">
                  <p className="text-white text-[10px] sm:text-[11px] font-bold">{currSymbol}{sale?.amount?.toLocaleString()}</p>
                  {sale?.product && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.product}</p>}
                  {sale?.brand && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.brand}</p>}
                  {sale?.customer_name && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.customer_name}</p>}
                </div>
                <div className="absolute top-1.5 left-1.5 bg-green-500 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    );
  };

  const renderReservedStories = () => {
    if (reservedStories.length === 0) {
      return (
        <div className="flex items-center justify-center h-[178px] text-sm text-muted-foreground">
          No hay apartados
        </div>
      );
    }
    return (
      <ScrollArea className="w-full h-[500px] sm:h-[580px]">
        <div className={storyGridClassName}>
          {reservedStories.map((story) => {
            const sale = reservedMap.get(story.storyId);
            const currSymbol = sale?.currency === 'CRC' ? '₡' : '$';
            const hours = Math.floor((Date.now() - parseISO(story.timestamp).getTime()) / 3600000);
            const timeLabel = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
            const isVideo = story.mediaType === 'VIDEO';
            const { previewSrc, fallbackSrc, previewClassName, containerClassName } = getStoryPreviewProps(story);
            const isConfirming = confirmingReservation === sale?.id;

            return (
              <div
                key={story.id}
                className={cn(
                  'relative w-full aspect-[9/16] rounded-xl overflow-hidden border-2 border-amber-500/50 group',
                  containerClassName
                )}
              >
                {previewSrc ? (
                  <StoryImage src={previewSrc} fallbackSrc={fallbackSrc} className={previewClassName} isVideo={isVideo} />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {isVideo ? <Play className="h-5 w-5 text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <span className="absolute top-1 right-1 text-white/80 text-[7px] sm:text-[8px] font-medium drop-shadow-sm z-10">{timeLabel}</span>
                <div className="absolute bottom-0 inset-x-0 p-1.5 pt-7">
                  <p className="text-white text-[10px] sm:text-[11px] font-bold">{currSymbol}{sale?.amount?.toLocaleString()}</p>
                  {sale?.product && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.product}</p>}
                  {sale?.brand && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.brand}</p>}
                  {sale?.customer_name && <p className="text-white/75 text-[8px] sm:text-[9px] truncate">{sale.customer_name}</p>}
                  {sale && (
                    <button
                      onClick={() => confirmReservation(sale.id)}
                      disabled={isConfirming}
                      className="mt-1 w-full flex items-center justify-center gap-1 text-[9px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full py-1 px-2 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {isConfirming ? 'Confirmando...' : 'Confirmar venta'}
                    </button>
                  )}
                </div>
                <div className="absolute top-1.5 left-1.5 bg-amber-500 rounded-full p-1">
                  <Clock className="h-3 w-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="vertical" />
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
                <TabsTrigger value="apartados" className="gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Apartados ({reservedStories.length})
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
                {hasMoreArchived && (
                  <div className="flex justify-center pt-2 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setAllArchivedDialogOpen(true);
                        fetchAllArchived();
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Ver todas las archivadas
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="apartados">
                {renderReservedStories()}
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
              <div className="relative flex-shrink-0 w-full max-h-[50vh] md:max-h-none md:w-[340px] md:h-[604px] rounded-xl overflow-hidden border bg-black">
                <StoryDialogPreview story={selectedStory} key={selectedStory.id} />
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
                      <Label className="text-xs flex items-center justify-between">
                        Cliente *
                        <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              Buscar <ChevronsUpDown className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="end">
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." className="h-9" />
                              <CommandList>
                                <CommandEmpty>Sin resultados</CommandEmpty>
                                <CommandGroup>
                                  {customerContacts.slice(0, 100).map((c: CustomerContact) => (
                                    <CommandItem
                                      key={c.id}
                                      value={`${c.full_name} ${c.phone || ''}`}
                                      onSelect={() => {
                                        setCustomerName(c.full_name);
                                        if (c.phone) setCustomerPhone(c.phone);
                                        setSavedAddresses(c.addresses || []);
                                        if ((c.addresses || []).length === 1) {
                                          setDeliveryAddress(c.addresses[0].address_line_1 || '');
                                        }
                                        setContactPickerOpen(false);
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium">{c.full_name}</span>
                                        {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </Label>
                      <Input
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          // auto-find contact on phone match
                        }}
                        placeholder="Nombre del cliente"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomerPhone(v);
                          // Try to find by phone
                          const trimmed = v.trim();
                          if (trimmed.length >= 6) {
                            const match = customerContacts.find(c => c.phone === trimmed);
                            if (match) {
                              if (!customerName.trim()) setCustomerName(match.full_name);
                              setSavedAddresses(match.addresses || []);
                              if ((match.addresses || []).length === 1 && !deliveryAddress) {
                                setDeliveryAddress(match.addresses[0].address_line_1 || '');
                              }
                            }
                          }
                        }}
                        placeholder="8888-8888"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <Input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Nombre de la marca"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de prenda</Label>
                      <Input
                        value={garmentType}
                        onChange={(e) => setGarmentType(e.target.value)}
                        placeholder="Vestido, blusa, etc."
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Talla</Label>
                    <Select value={garmentSize} onValueChange={setGarmentSize}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {GARMENT_SIZES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label className="text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Dirección de entrega
                    </Label>
                    {savedAddresses.length > 0 && (
                      <Select
                        value={deliveryAddress}
                        onValueChange={(v) => setDeliveryAddress(v === '_new' ? '' : v)}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue placeholder="Direcciones guardadas" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedAddresses.map((a, i) => (
                            <SelectItem key={i} value={a.address_line_1}>
                              <span className="text-xs">{a.label ? `${a.label}: ` : ''}{a.address_line_1.slice(0, 60)}{a.address_line_1.length > 60 ? '…' : ''}</span>
                            </SelectItem>
                          ))}
                          <SelectItem value="_new"><span className="text-xs italic">+ Nueva dirección</span></SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Dirección completa de entrega"
                      className="text-sm min-h-[60px] mt-1.5"
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

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || !amount || !customerName.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Registrando...' : 'Registrar Venta'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={submitting || !amount || !customerName.trim()}
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    {submitting ? 'Registrando...' : 'Apartar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All archived stories dialog */}
      <Dialog open={allArchivedDialogOpen} onOpenChange={setAllArchivedDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Todas las historias archivadas
            </DialogTitle>
          </DialogHeader>
          {isLoadingAllArchived ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">Cargando historias...</p>
            </div>
          ) : (
            (() => {
              const unsoldAll = allArchivedStories.filter(s => !allTakenSet.has(s.storyId));
              return unsoldAll.length === 0 ? (
                <div className="flex items-center justify-center h-[178px] text-sm text-muted-foreground">
                  No hay historias archivadas
                </div>
              ) : (
                <ScrollArea className="w-full h-[70vh]">
                  <div className={storyGridClassName}>
                    {unsoldAll.map((story) => (
                      <StoryCard key={story.id} story={story} isSold={false} isReserved={false} />
                    ))}
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
