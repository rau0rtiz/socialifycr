import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleBlock {
  day: string;
  start: string;
  end: string;
}

export interface ClassGroup {
  id: string;
  client_id: string;
  product_id: string;
  name: string;
  capacity: number;
  age_range_min: number | null;
  age_range_max: number | null;
  english_level: string | null;
  teacher_id: string | null;
  classroom: string | null;
  schedules: ScheduleBlock[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ClassGroupMember {
  id: string;
  group_id: string;
  student_contact_id: string;
  sale_id: string | null;
  enrolled_at: string;
  status: string;
}

export interface ClassGroupInput {
  product_id: string;
  name: string;
  capacity?: number;
  age_range_min?: number | null;
  age_range_max?: number | null;
  english_level?: string | null;
  teacher_id?: string | null;
  classroom?: string | null;
  schedules?: ScheduleBlock[];
  status?: string;
}

export const CEFR_LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const useClassGroups = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['class-groups', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('class_groups')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        schedules: Array.isArray(g.schedules) ? g.schedules : [],
      })) as ClassGroup[];
    },
    enabled: !!clientId,
  });

  const membersQuery = useQuery({
    queryKey: ['class-group-members', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const groups = query.data || [];
      if (groups.length === 0) return [];
      const groupIds = groups.map(g => g.id);
      const { data, error } = await supabase
        .from('class_group_members')
        .select('*')
        .in('group_id', groupIds);
      if (error) throw error;
      return (data || []) as ClassGroupMember[];
    },
    enabled: !!clientId && (query.data || []).length > 0,
  });

  const addGroup = useMutation({
    mutationFn: async (input: ClassGroupInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('class_groups')
        .insert({
          client_id: clientId,
          product_id: input.product_id,
          name: input.name.trim(),
          capacity: input.capacity || 10,
          age_range_min: input.age_range_min ?? null,
          age_range_max: input.age_range_max ?? null,
          english_level: input.english_level ?? null,
          teacher_id: input.teacher_id ?? null,
          classroom: input.classroom?.trim() || null,
          schedules: (input.schedules || []) as any,
          status: input.status || 'active',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClassGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups', clientId] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ClassGroupInput> & { id: string }) => {
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.product_id !== undefined) updateData.product_id = input.product_id;
      if (input.capacity !== undefined) updateData.capacity = input.capacity;
      if (input.age_range_min !== undefined) updateData.age_range_min = input.age_range_min;
      if (input.age_range_max !== undefined) updateData.age_range_max = input.age_range_max;
      if (input.english_level !== undefined) updateData.english_level = input.english_level;
      if (input.teacher_id !== undefined) updateData.teacher_id = input.teacher_id;
      if (input.classroom !== undefined) updateData.classroom = input.classroom?.trim() || null;
      if (input.schedules !== undefined) updateData.schedules = input.schedules;
      if (input.status !== undefined) updateData.status = input.status;
      const { error } = await supabase.from('class_groups').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups', clientId] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups', clientId] });
      queryClient.invalidateQueries({ queryKey: ['class-group-members', clientId] });
    },
  });

  const addMember = useMutation({
    mutationFn: async ({ groupId, studentContactId, saleId }: { groupId: string; studentContactId: string; saleId?: string }) => {
      const { data, error } = await supabase
        .from('class_group_members')
        .insert({
          group_id: groupId,
          student_contact_id: studentContactId,
          sale_id: saleId || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClassGroupMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-group-members', clientId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('class_group_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-group-members', clientId] });
    },
  });

  const getGroupMembers = (groupId: string) => (membersQuery.data || []).filter(m => m.group_id === groupId && m.status === 'active');
  const getGroupOccupancy = (groupId: string) => getGroupMembers(groupId).length;

  return {
    groups: query.data || [],
    members: membersQuery.data || [],
    isLoading: query.isLoading,
    addGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    getGroupMembers,
    getGroupOccupancy,
  };
};
