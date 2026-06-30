import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, BellOff, Inbox, Search, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useBrand } from '@/contexts/BrandContext';
import { useSellerLeads, useSellerLeadCounts, type SellerLead } from '@/hooks/use-seller-leads';
import { useClientSellers } from '@/hooks/use-instant-form-leads';
import { SellerLeadCard } from '@/components/seller-crm/SellerLeadCard';
import { SellerLeadDetailDialog } from '@/components/seller-crm/SellerLeadDetailDialog';

const STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'contactado', label: 'Contactados' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'venta', label: 'Ventas' },
  { value: 'perdido', label: 'Perdidos' },
];

const SellerCrm = () => {
  const { user } = useAuth();
  const { systemRole, canManage, loading: roleLoading } = useUserRole();
  const { selectedClient } = useBrand();

  const isManagerView = canManage; // owner/admin/manager — they get the supervisor view
  const mode: 'self' | 'manager' = isManagerView ? 'manager' : 'self';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false
  );

  const { data: sellers = [] } = useClientSellers(isManagerView ? (selectedClient?.id || null) : null);

  const { data: leads = [], isLoading } = useSellerLeads({
    mode,
    clientId: isManagerView ? (selectedClient?.id || null) : null,
    sellerId: isManagerView ? (selectedSellerId === 'all' ? null : selectedSellerId) : null,
  });

  const counts = useSellerLeadCounts(leads);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const s = l.lead_status || 'new';
      if (statusFilter !== 'all' && s !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [l.full_name, l.phone, l.campaign_name, l.ad_name, l.client_name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, search]);

  // New leads counter (sin contactar)
  const newCount = counts.new;

  const handleOpen = (lead: SellerLead) => { setOpenLead(lead); setDialogOpen(true); };

  const requestNotifPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') { setNotifEnabled(true); return; }
    const res = await Notification.requestPermission();
    setNotifEnabled(res === 'granted');
  };

  // Update favicon-style: page title with unread count
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const base = 'Mis Leads';
    document.title = newCount > 0 ? `(${newCount}) ${base}` : base;
    return () => { document.title = base; };
  }, [newCount]);

  if (roleLoading) {
    return <DashboardLayout><div className="p-6 text-muted-foreground">Cargando...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 px-1 sm:px-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">{isManagerView ? 'CRM de Vendedores' : 'Mis Leads'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {isManagerView
                ? 'Supervisa la cola y el avance de cada vendedor.'
                : 'Aquí caen tus leads asignados. Atendelos rápido y registrá la venta cuando cierres.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {newCount > 0 && (
              <Badge variant="default" className="bg-[hsl(var(--status-new))] text-white animate-pulse text-[10px] sm:text-xs px-1.5 sm:px-2.5">
                {newCount} {newCount === 1 ? 'nuevo' : 'nuevos'}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 sm:w-auto sm:px-3"
              onClick={requestNotifPermission}
              title={notifEnabled ? 'Notificaciones activas' : 'Activar notificaciones del navegador'}
            >
              {notifEnabled ? <Bell className="h-4 w-4 text-[hsl(var(--status-venta))]" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* KPIs - 5 cols always, more compact on mobile */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[
            { key: 'new', label: 'Nuevos',       value: counts.new,         color: 'status-new' },
            { key: 'contactado', label: 'Contact.', value: counts.contactado,  color: 'status-contactado' },
            { key: 'seguimiento', label: 'Segui.', value: counts.seguimiento, color: 'status-seguimiento' },
            { key: 'venta', label: 'Ventas',     value: counts.venta,       color: 'status-venta' },
            { key: 'perdido', label: 'Perdidos',  value: counts.perdido,     color: 'status-perdido' },
          ].map((k) => (
            <Card
              key={k.key}
              className={`p-2 sm:p-3 cursor-pointer transition-all active:scale-95 ${statusFilter === k.key ? `ring-2 ring-[hsl(var(--${k.color}))]` : ''}`}
              onClick={() => setStatusFilter(statusFilter === k.key ? 'all' : k.key)}
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{k.label}</p>
              <p className={`text-lg sm:text-2xl font-bold tabular-nums text-[hsl(var(--${k.color}))]`}>{k.value}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nombre, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 sm:h-9 text-base sm:text-sm"
            />
          </div>
          {isManagerView && (
            <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-9">
                <Users className="h-4 w-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vendedores</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full overflow-x-auto flex justify-start sm:justify-center sm:flex-wrap h-auto no-scrollbar">
            {STATUSES.map((s) => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs whitespace-nowrap shrink-0">{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando leads...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {leads.length === 0
                ? (isManagerView ? 'Aún no hay leads en esta vista.' : 'No tenés leads asignados todavía.')
                : 'Sin leads que coincidan con el filtro.'}
            </p>
            {!isManagerView && leads.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Cuando entre un lead nuevo te aparecerá aquí automáticamente.
              </p>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {filtered.map((lead) => (
              <SellerLeadCard
                key={lead.id}
                lead={lead}
                onOpen={() => handleOpen(lead)}
                showClient={isManagerView}
              />
            ))}
          </div>
        )}
      </div>

      <SellerLeadDetailDialog lead={openLead} open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
};

export default SellerCrm;

