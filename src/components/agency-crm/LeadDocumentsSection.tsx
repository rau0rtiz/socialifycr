import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ExternalLink, Link2, Plus, Loader2, Unlink, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocRow {
  id: string;
  title: string;
  slug: string;
  kind: string;
  view_count: number;
  is_published: boolean;
  crm_lead_id: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  proposal: 'Propuesta',
  report: 'Reporte',
  content_plan: 'Plan de contenido',
};

const publicPath = (d: DocRow) => `${d.kind === 'report' ? '/reporte' : '/propuesta'}/${d.slug}`;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'propuesta';

interface Props {
  leadId: string;
  leadName: string;
}

export const LeadDocumentsSection = ({ leadId, leadName }: Props) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [linkId, setLinkId] = useState<string>('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['agency-proposals-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_proposals')
        .select('id,title,slug,kind,view_count,is_published,crm_lead_id,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as DocRow[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const linked = useMemo(() => docs.filter((d) => d.crm_lead_id === leadId), [docs, leadId]);
  const available = useMemo(() => docs.filter((d) => !d.crm_lead_id), [docs]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['agency-proposals-crm'] });
    qc.invalidateQueries({ queryKey: ['agency-proposals'] });
  };

  const setLink = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string | null }) => {
      const { error } = await supabase
        .from('agency_proposals')
        .update({ crm_lead_id: value } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createDoc = useMutation({
    mutationFn: async () => {
      const title = `Propuesta — ${leadName || 'Sin nombre'}`;
      const { data, error } = await supabase
        .from('agency_proposals')
        .insert({
          title,
          client_name: leadName || null,
          html_content: '',
          slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'proposal',
          is_published: true,
          created_by: user?.id ?? null,
          crm_lead_id: leadId,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Documento creado', description: 'Editá el contenido en /agencia/documentacion' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Propuestas y reportes
        </Label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => createDoc.mutate()} disabled={createDoc.isPending}>
            {createDoc.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Crear documento
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.open('/agencia/documentacion', '_blank')}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Documentación
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando documentos...
        </div>
      ) : linked.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin documentos vinculados a este lead.</p>
      ) : (
        <div className="space-y-2">
          {linked.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{KIND_LABEL[d.kind] || d.kind}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {d.view_count}</span>
                  {!d.is_published && <span className="text-amber-600">Oculto</span>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => window.open(publicPath(d), '_blank')} title="Abrir enlace público">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setLink.mutate({ id: d.id, value: null })}
                title="Desvincular"
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Vincular documento existente</Label>
          <Select value={linkId} onValueChange={setLinkId}>
            <SelectTrigger>
              <SelectValue placeholder={available.length ? 'Elegí un documento...' : 'No hay documentos sin vincular'} />
            </SelectTrigger>
            <SelectContent>
              {available.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {KIND_LABEL[d.kind] || d.kind}: {d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          disabled={!linkId || setLink.isPending}
          onClick={() => {
            setLink.mutate({ id: linkId, value: leadId });
            setLinkId('');
          }}
        >
          <Link2 className="h-4 w-4 mr-1" /> Vincular
        </Button>
      </div>
    </div>
  );
};
