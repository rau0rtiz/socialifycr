import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Database, Download, Search, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import {
  SOURCES,
  useDatabaseContacts,
  type SourceKey,
} from '@/hooks/use-database-contacts';


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
