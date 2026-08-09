import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Database, Download, Search, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SourceKey = 'crm' | 'lp' | 'listas' | 'clientes' | 'estudiantes' | 'usuarios';

const SOURCES: { key: SourceKey; label: string; className: string }[] = [
  { key: 'crm', label: 'CRM Agencia', className: 'bg-primary/10 text-primary border-primary/20' },
  { key: 'lp', label: 'Funnels / LP', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'listas', label: 'Listas de email', className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { key: 'clientes', label: 'Compradores', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'estudiantes', label: 'Estudiantes', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { key: 'usuarios', label: 'Usuarios del sistema', className: 'bg-muted text-muted-foreground border-border' },
];

interface Entry {
  email: string;
  name: string | null;
  phone: string | null;
  sources: Set<SourceKey>;
  detail: Set<string>;
  lastSeen: string | null;
}

const norm = (e?: string | null) => (e || '').trim().toLowerCase();

const useDatabaseContacts = () =>
  useQuery({
    queryKey: ['agency-email-database'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [clients, crm, funnel, lists, buyers, students, users, suppressed] = await Promise.all([
        supabase.from('clients').select('id, name'),
        supabase.from('agency_crm_leads').select('name, email, phone, status, created_at').limit(5000),
        supabase.from('funnel_leads').select('name, email, phone, created_at, answers, funnel_id').limit(5000),
        supabase.from('email_contacts').select('full_name, email, status, client_id, created_at').limit(5000),
        supabase.from('customer_contacts').select('full_name, email, phone, client_id, created_at').limit(5000),
        supabase.from('student_contacts').select('full_name, email, phone, client_id, created_at').limit(5000),
        supabase.from('profiles').select('full_name, email, phone, created_at').limit(2000),
        supabase.from('suppressed_emails').select('email').limit(5000),
      ]);

      const clientName = new Map<string, string>(
        (clients.data || []).map((c: any) => [c.id, c.name as string]),
      );
      const suppressedSet = new Set<string>((suppressed.data || []).map((s: any) => norm(s.email)));

      const map = new Map<string, Entry>();
      const push = (
        email: string | null | undefined,
        name: string | null | undefined,
        phone: string | null | undefined,
        source: SourceKey,
        detail: string | null,
        createdAt: string | null,
      ) => {
        const key = norm(email);
        if (!key || !key.includes('@')) return;
        const existing = map.get(key);
        if (existing) {
          existing.sources.add(source);
          if (detail) existing.detail.add(detail);
          if (!existing.name && name) existing.name = name;
          if (!existing.phone && phone) existing.phone = phone;
          if (createdAt && (!existing.lastSeen || createdAt > existing.lastSeen)) existing.lastSeen = createdAt;
          return;
        }
        map.set(key, {
          email: key,
          name: name?.trim() || null,
          phone: phone?.trim() || null,
          sources: new Set([source]),
          detail: new Set(detail ? [detail] : []),
          lastSeen: createdAt,
        });
      };

      (crm.data || []).forEach((r: any) =>
        push(r.email, r.name, r.phone, 'crm', r.status ? `CRM: ${r.status}` : null, r.created_at),
      );
      (funnel.data || []).forEach((r: any) => {
        const a = r.answers || {};
        const slug =
          a.landing_slug ||
          (typeof a.source === 'string' && a.source.startsWith('landing:') ? a.source.split(':')[1] : null);
        push(r.email, r.name, r.phone, 'lp', slug ? `LP: ${slug}` : 'Funnel', r.created_at);
      });
      (lists.data || []).forEach((r: any) =>
        push(
          r.email,
          r.full_name,
          null,
          'listas',
          clientName.get(r.client_id) || null,
          r.created_at,
        ),
      );
      (buyers.data || []).forEach((r: any) =>
        push(r.email, r.full_name, r.phone, 'clientes', clientName.get(r.client_id) || null, r.created_at),
      );
      (students.data || []).forEach((r: any) =>
        push(r.email, r.full_name, r.phone, 'estudiantes', clientName.get(r.client_id) || null, r.created_at),
      );
      (users.data || []).forEach((r: any) =>
        push(r.email, r.full_name, r.phone, 'usuarios', null, r.created_at),
      );

      const rows = Array.from(map.values()).sort((a, b) =>
        (b.lastSeen || '').localeCompare(a.lastSeen || ''),
      );
      return { rows, suppressedSet };
    },
  });

export default function BaseDeDatos() {
  const { data, isLoading } = useDatabaseContacts();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SourceKey | 'all'>('all');

  const rows = data?.rows || [];
  const suppressed = data?.suppressedSet || new Set<string>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== 'all' && !r.sources.has(source)) return false;
      if (!q) return true;
      return (
        r.email.includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        Array.from(r.detail).some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [rows, search, source, suppressed]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    SOURCES.forEach((s) => (c[s.key] = 0));
    rows.forEach((r) => r.sources.forEach((s) => (c[s] += 1)));
    return c;
  }, [rows]);

  const exportCsv = () => {
    const header = ['Email', 'Nombre', 'Teléfono', 'Orígenes', 'Detalle', 'Último registro'];
    const lines = filtered.map((r) =>
      [
        r.email,
        r.name || '',
        r.phone || '',
        Array.from(r.sources)
          .map((s) => SOURCES.find((x) => x.key === s)?.label || s)
          .join(' | '),
        Array.from(r.detail).join(' | '),
        r.lastSeen ? new Date(r.lastSeen).toLocaleDateString('es-CR') : '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base-de-datos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyEmails = async () => {
    await navigator.clipboard.writeText(filtered.map((r) => r.email).join(', '));
    toast.success(`${filtered.length} correos copiados`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Base de datos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Todos los correos que viven en el sistema: CRM, funnels y landings, listas de email,
              compradores, estudiantes y usuarios.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={copyEmails} disabled={!filtered.length}>
              <Copy className="h-4 w-4" /> Copiar correos
            </Button>
            <Button size="sm" className="gap-2" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card
            className={cn(
              'p-3 rounded-2xl cursor-pointer transition-colors',
              source === 'all' && 'ring-1 ring-primary',
            )}
            onClick={() => setSource('all')}
          >
            <p className="text-xs text-muted-foreground">Total únicos</p>
            <p className="text-xl font-bold">{rows.length}</p>
          </Card>
          {SOURCES.map((s) => (
            <Card
              key={s.key}
              className={cn(
                'p-3 rounded-2xl cursor-pointer transition-colors',
                source === s.key && 'ring-1 ring-primary',
              )}
              onClick={() => setSource(source === s.key ? 'all' : s.key)}
            >
              <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              <p className="text-xl font-bold">{counts[s.key] || 0}</p>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por correo, nombre, teléfono u origen…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Correo</th>
                    <th className="text-left font-medium px-4 py-2">Nombre</th>
                    <th className="text-left font-medium px-4 py-2">Teléfono</th>
                    <th className="text-left font-medium px-4 py-2">Orígenes</th>
                    <th className="text-left font-medium px-4 py-2">Detalle</th>
                    <th className="text-left font-medium px-4 py-2">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((r) => (
                    <tr key={r.email} className="border-t border-border/60 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          {r.email}
                          {suppressed.has(r.email) && (
                            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                              baja
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2">{r.name || '—'}</td>
                      <td className="px-4 py-2">{r.phone || '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(r.sources).map((s) => {
                            const meta = SOURCES.find((x) => x.key === s);
                            return (
                              <Badge key={s} variant="outline" className={cn('text-[10px]', meta?.className)}>
                                {meta?.label || s}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs max-w-[240px] truncate">
                        {Array.from(r.detail).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {r.lastSeen ? new Date(r.lastSeen).toLocaleDateString('es-CR') : '—'}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 500 && (
              <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border/60">
                Mostrando 500 de {filtered.length} — refiná la búsqueda o exportá el CSV completo.
              </p>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
