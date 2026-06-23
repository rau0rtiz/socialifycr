import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SheetStatus = 'draft' | 'in_production' | 'done' | 'sent_to_clickup';

export interface ProductionSheet {
  id: string;
  client_id: string;
  folder_id: string | null;
  title: string;
  shoot_date: string | null;
  location: string | null;
  call_time: string | null;
  producer_name: string | null;
  status: SheetStatus;
  notes: string | null;
  clickup_task_id: string | null;
  clickup_url: string | null;
  sent_to_clickup_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  public_share_token: string | null;
  public_share_enabled: boolean;
  clickup_list_id: string | null;
  clickup_list_name: string | null;
  clickup_space_id: string | null;
  clickup_space_name: string | null;
}

export interface SheetTeamMember {
  id: string;
  sheet_id: string;
  role: string;
  name: string;
  clickup_user_email: string | null;
  sort_order: number;
}

export interface SheetShot {
  id: string;
  sheet_id: string;
  scene_label: string | null;
  shot_number: string | null;
  description: string;
  shot_type: string | null;
  duration_estimate: string | null;
  done: boolean;
  notes: string | null;
  sort_order: number;
  // Nuevos campos: tablero de piezas de contenido
  content_type: string | null;   // reel | story | post | tiktok | short | otro
  platform: string | null;       // instagram | tiktok | youtube | linkedin | multi
  concept: string | null;
  script: string | null;
  hook: string | null;
  cta: string | null;
  tech_notes: string | null;
  recorded_at: string | null;
  clickup_task_id: string | null;
  clickup_url: string | null;
  sent_to_clickup_at: string | null;
  is_draft: boolean;
}

export interface SheetWardrobe {
  id: string;
  sheet_id: string;
  item: string;
  done: boolean;
  sort_order: number;
}

export const useProductionSheets = () =>
  useQuery({
    queryKey: ['production-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_sheets')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ProductionSheet[];
    },
  });

export const useReorderSheets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map((it) =>
          supabase.from('production_sheets').update({ sort_order: it.sort_order } as any).eq('id', it.id)
        )
      );
    },
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: ['production-sheets'] });
      const prev = qc.getQueryData<ProductionSheet[]>(['production-sheets']);
      if (prev) {
        const map = new Map(items.map(i => [i.id, i.sort_order]));
        qc.setQueryData<ProductionSheet[]>(
          ['production-sheets'],
          prev.map(s => map.has(s.id) ? ({ ...s, sort_order: map.get(s.id)! } as any) : s)
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['production-sheets'], ctx.prev);
      toast.error('No se pudo reordenar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['production-sheets'] }),
  });
};

export const useProductionSheet = (id: string | null) =>
  useQuery({
    queryKey: ['production-sheet', id],
    enabled: !!id,
    queryFn: async () => {
      const [sheet, team, shots, wardrobe] = await Promise.all([
        supabase.from('production_sheets').select('*').eq('id', id!).maybeSingle(),
        supabase.from('production_sheet_team').select('*').eq('sheet_id', id!).order('sort_order'),
        supabase.from('production_sheet_shots').select('*').eq('sheet_id', id!).order('sort_order'),
        supabase.from('production_sheet_wardrobe').select('*').eq('sheet_id', id!).order('sort_order'),
      ]);
      if (sheet.error) throw sheet.error;
      return {
        sheet: sheet.data as ProductionSheet,
        team: (team.data || []) as SheetTeamMember[],
        shots: (shots.data || []) as SheetShot[],
        wardrobe: (wardrobe.data || []) as SheetWardrobe[],
      };
    },
  });

export const useCreateSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; title?: string; folder_id?: string | null }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('production_sheets')
        .insert({
          client_id: input.client_id,
          folder_id: input.folder_id ?? null,
          title: input.title || 'Nueva producción',
          created_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProductionSheet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-sheets'] });
      toast.success('Sheet creada');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ProductionSheet> & { id: string }) => {
      const { error } = await supabase.from('production_sheets').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['production-sheet', vars.id] });
      qc.invalidateQueries({ queryKey: ['production-sheets'] });
    },
  });
};

export const useDeleteSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_sheets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-sheets'] });
      toast.success('Sheet eliminada');
    },
  });
};

// ---- children CRUD generic helpers ----
type ChildTable = 'production_sheet_team' | 'production_sheet_shots' | 'production_sheet_wardrobe';

export const useUpsertChild = (table: ChildTable) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from(table).upsert(row);
      if (error) throw error;
    },
    onSuccess: (_d, vars: any) => {
      if (vars.sheet_id) qc.invalidateQueries({ queryKey: ['production-sheet', vars.sheet_id] });
    },
  });
};

export const useDeleteChild = (table: ChildTable) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; sheet_id: string }) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['production-sheet', vars.sheet_id] });
    },
  });
};

// Reorder shots within a sheet (optimistic)
export const useReorderShots = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sheet_id, items }: { sheet_id: string; items: { id: string; sort_order: number }[] }) => {
      await Promise.all(
        items.map((it) =>
          supabase.from('production_sheet_shots').update({ sort_order: it.sort_order }).eq('id', it.id)
        )
      );
    },
    onMutate: async ({ sheet_id, items }) => {
      await qc.cancelQueries({ queryKey: ['production-sheet', sheet_id] });
      const prev = qc.getQueryData<any>(['production-sheet', sheet_id]);
      if (prev?.shots) {
        const map = new Map(items.map(i => [i.id, i.sort_order]));
        const nextShots = prev.shots
          .map((s: SheetShot) => map.has(s.id) ? { ...s, sort_order: map.get(s.id)! } : s)
          .sort((a: SheetShot, b: SheetShot) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        qc.setQueryData(['production-sheet', sheet_id], { ...prev, shots: nextShots });
      }
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['production-sheet', vars.sheet_id], ctx.prev);
      toast.error('No se pudo reordenar');
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['production-sheet', vars.sheet_id] });
    },
  });
};

