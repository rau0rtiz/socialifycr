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
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ProductionSheet[];
    },
  });

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
