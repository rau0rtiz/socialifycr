import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaunchPhaseTask {
  id: string;
  campaign_id: string;
  phase_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export const useLaunchTasks = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ['launch-phase-tasks', campaignId],
    queryFn: async () => {
      if (!campaignId) return [] as LaunchPhaseTask[];
      const { data, error } = await (supabase as any)
        .from('launch_phase_tasks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LaunchPhaseTask[];
    },
    enabled: !!campaignId,
  });
};

export const useCreateLaunchTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      phase_id: string;
      title: string;
      position?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from('launch_phase_tasks')
        .insert({
          campaign_id: input.campaign_id,
          phase_id: input.phase_id,
          title: input.title,
          position: input.position ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LaunchPhaseTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['launch-phase-tasks', data.campaign_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Error creando tarea'),
  });
};

export const useUpdateLaunchTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LaunchPhaseTask> & { id: string }) => {
      const { id, ...rest } = input;
      const { data, error } = await (supabase as any)
        .from('launch_phase_tasks')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LaunchPhaseTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['launch-phase-tasks', data.campaign_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Error actualizando tarea'),
  });
};

export const useDeleteLaunchTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; campaign_id: string }) => {
      const { error } = await (supabase as any)
        .from('launch_phase_tasks')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['launch-phase-tasks', vars.campaign_id] });
      toast.success('Tarea eliminada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error eliminando tarea'),
  });
};
