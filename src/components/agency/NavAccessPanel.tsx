import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AGENCY_NAV } from './nav-items';
import { ALWAYS_VISIBLE } from '@/hooks/use-nav-access';

const AGENCY_ROLES = ['admin', 'manager', 'media_buyer', 'closer', 'setter'];

/** Owner-only panel: choose which menu sections each team member can see. */
export const NavAccessPanel = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['nav-access-admin'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const ownerIds = new Set((roles ?? []).filter((r: any) => r.role === 'owner').map((r: any) => r.user_id));
      const ids = Array.from(new Set((roles ?? [])
        .filter((r: any) => AGENCY_ROLES.includes(r.role) && !ownerIds.has(r.user_id))
        .map((r: any) => r.user_id)));
      if (!ids.length) return [];
      const [{ data: profiles }, { data: access }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', ids),
        supabase.from('agency_nav_access').select('user_id, hidden_sections').in('user_id', ids),
      ]);
      const map = new Map((access ?? []).map((a: any) => [a.user_id, a.hidden_sections as string[]]));
      return (profiles ?? [])
        .map((p: any) => ({ ...p, hidden: map.get(p.id) ?? [] }))
        .sort((a: any, b: any) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''));
    },
  });

  const save = useMutation({
    mutationFn: async ({ userId, hidden }: { userId: string; hidden: string[] }) => {
      const { error } = await supabase.from('agency_nav_access')
        .upsert({ user_id: userId, hidden_sections: hidden, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nav-access-admin'] }),
    onError: () => toast.error('No se pudo guardar'),
  });

  const sections = AGENCY_NAV.filter((s) => !ALWAYS_VISIBLE.includes(s.url));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Quién ve qué</CardTitle>
        <CardDescription>Prendé o apagá las secciones del menú para cada persona. Vos siempre ves todo. Resumen siempre está visible.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {data?.map((u: any) => (
          <div key={u.id} className="rounded-lg border border-border p-4">
            <div className="mb-3">
              <p className="font-medium text-foreground">{u.full_name || u.email}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => {
                const visible = !u.hidden.includes(s.url);
                const Icon = s.icon;
                return (
                  <label key={s.url} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm cursor-pointer">
                    <span className="flex items-center gap-2 min-w-0"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{s.title}</span></span>
                    <Switch
                      checked={visible}
                      onCheckedChange={(on) => {
                        const hidden = on ? u.hidden.filter((h: string) => h !== s.url) : [...u.hidden, s.url];
                        save.mutate({ userId: u.id, hidden });
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
