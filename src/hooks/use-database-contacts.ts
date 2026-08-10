import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SourceKey = 'crm' | 'lp' | 'listas' | 'clientes' | 'estudiantes' | 'usuarios';

export const SOURCES: { key: SourceKey; label: string; className: string }[] = [
  { key: 'crm', label: 'CRM Agencia', className: 'bg-primary/10 text-primary border-primary/20' },
  { key: 'lp', label: 'Funnels / LP', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'listas', label: 'Listas de email', className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { key: 'clientes', label: 'Compradores', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'estudiantes', label: 'Estudiantes', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { key: 'usuarios', label: 'Usuarios del sistema', className: 'bg-muted text-muted-foreground border-border' },
];

export interface Entry {
  email: string;
  name: string | null;
  phone: string | null;
  sources: Set<SourceKey>;
  detail: Set<string>;
  lastSeen: string | null;
}

export const norm = (e?: string | null) => (e || '').trim().toLowerCase();

/**
 * Aggregates every email we hold across CRM, funnels/LP, email lists,
 * buyers, students and system users into a single deduplicated directory.
 * Shared by the Base de datos page and the campaign audience picker.
 */
export const useDatabaseContacts = (enabled = true) =>
  useQuery({
    queryKey: ['agency-email-database'],
    staleTime: 5 * 60 * 1000,
    enabled,
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
        push(r.email, r.full_name, null, 'listas', clientName.get(r.client_id) || null, r.created_at),
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
