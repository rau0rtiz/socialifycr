import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeacherScheduleBlock {
  day: string;
  start: string;
  end: string;
}

export interface ClientTeacher {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  available_schedules: TeacherScheduleBlock[];
  product_ids: string[];
  audience_types: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  available_schedules?: TeacherScheduleBlock[];
  product_ids?: string[];
  audience_types?: string[];
  status?: string;
}

export const useClientTeachers = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-teachers', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_teachers')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        available_schedules: Array.isArray(t.available_schedules) ? t.available_schedules : [],
        product_ids: Array.isArray(t.product_ids) ? t.product_ids : [],
        audience_types: Array.isArray(t.audience_types) ? t.audience_types : [],
      })) as ClientTeacher[];
    },
    enabled: !!clientId,
  });

  const addTeacher = useMutation({
    mutationFn: async (input: TeacherInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('client_teachers')
        .insert({
          client_id: clientId,
          name: input.name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          available_schedules: (input.available_schedules || []) as any,
          product_ids: input.product_ids || [],
          audience_types: input.audience_types || [],
          status: input.status || 'active',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClientTeacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-teachers', clientId] });
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...input }: TeacherInput & { id: string }) => {
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.email !== undefined) updateData.email = input.email?.trim() || null;
      if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
      if (input.available_schedules !== undefined) updateData.available_schedules = input.available_schedules;
      if (input.product_ids !== undefined) updateData.product_ids = input.product_ids;
      if (input.audience_types !== undefined) updateData.audience_types = input.audience_types;
      if (input.status !== undefined) updateData.status = input.status;
      const { error } = await supabase
        .from('client_teachers')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-teachers', clientId] });
    },
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_teachers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-teachers', clientId] });
    },
  });

  return {
    teachers: query.data || [],
    isLoading: query.isLoading,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  };
};
