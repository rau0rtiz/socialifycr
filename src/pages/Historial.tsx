import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users, Link, Unlink, UserPlus, UserMinus, Pencil, Trash2, Plus, History, Filter,
} from 'lucide-react';

const ACTION_META: Record<string, { icon: typeof Users; label: string; color: string }> = {
  'client.create': { icon: Plus, label: 'Cliente creado', color: 'text-green-500' },
  'client.update': { icon: Pencil, label: 'Cliente actualizado', color: 'text-blue-500' },
  'client.delete': { icon: Trash2, label: 'Cliente eliminado', color: 'text-destructive' },
  'platform.connect': { icon: Link, label: 'Plataforma conectada', color: 'text-green-500' },
  'platform.disconnect': { icon: Unlink, label: 'Plataforma desconectada', color: 'text-orange-500' },
  'team_member.add': { icon: UserPlus, label: 'Miembro agregado', color: 'text-green-500' },
  'team_member.remove': { icon: UserMinus, label: 'Miembro removido', color: 'text-orange-500' },
};

const PAGE_SIZE = 50;

const Historial = () => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', actionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles:user_id(full_name, email, avatar_url)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const logs = data || [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Historial de Acciones</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {Object.entries(ACTION_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 pl-12 py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay acciones registradas
              </div>
            ) : (
              logs.map((log: any) => {
                const meta = ACTION_META[log.action] || { icon: History, label: log.action, color: 'text-muted-foreground' };
                const Icon = meta.icon;
                const profile = log.profiles;
                const userName = profile?.full_name || profile?.email || 'Usuario';
                const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <div key={log.id} className="relative flex items-start gap-4 py-3 pl-12 group">
                    {/* Timeline dot */}
                    <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${meta.color} bg-card`}>
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{userName}</span>
                        {' '}
                        <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
                        {log.entity_name && (
                          <>
                            {': '}
                            <span className="font-medium">{log.entity_name}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
              Anteriores
            </Button>
          )}
          {logs.length === PAGE_SIZE && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
              {isFetching ? 'Cargando...' : 'Cargar más'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Historial;
