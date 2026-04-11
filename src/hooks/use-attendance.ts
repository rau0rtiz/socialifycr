import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AttendanceRecord {
  id: string;
  client_id: string;
  student_contact_id: string;
  group_id: string | null;
  class_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  marked_by: string | null;
  created_at: string;
}

export interface AttendanceInput {
  student_contact_id: string;
  group_id?: string | null;
  class_date: string;
  status?: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
}

export const useAttendance = (clientId: string | null, classDate?: string, groupId?: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['attendance', clientId, classDate, groupId],
    queryFn: async () => {
      if (!clientId || !classDate) return [];
      let q = supabase
        .from('attendance_records')
        .select('*')
        .eq('client_id', clientId)
        .eq('class_date', classDate);
      if (groupId) q = q.eq('group_id', groupId);
      const { data, error } = await q.order('created_at');
      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!clientId && !!classDate,
  });

  const upsertAttendance = useMutation({
    mutationFn: async (input: AttendanceInput) => {
      if (!clientId || !user) throw new Error('Missing context');
      // Check if record exists
      let q = supabase
        .from('attendance_records')
        .select('id')
        .eq('client_id', clientId)
        .eq('student_contact_id', input.student_contact_id)
        .eq('class_date', input.class_date);
      if (input.group_id) q = q.eq('group_id', input.group_id);
      else q = q.is('group_id', null);
      const { data: existing } = await q.limit(1);

      if (existing && existing.length > 0) {
        const updateData: any = {};
        if (input.status !== undefined) updateData.status = input.status;
        if (input.check_in !== undefined) updateData.check_in = input.check_in;
        if (input.check_out !== undefined) updateData.check_out = input.check_out;
        if (input.notes !== undefined) updateData.notes = input.notes;
        const { error } = await supabase.from('attendance_records').update(updateData).eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_records').insert({
          client_id: clientId,
          student_contact_id: input.student_contact_id,
          group_id: input.group_id || null,
          class_date: input.class_date,
          status: input.status || 'present',
          check_in: input.check_in || null,
          check_out: input.check_out || null,
          notes: input.notes || null,
          marked_by: user.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', clientId] });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', clientId] });
    },
  });

  const records = query.data || [];
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const attendanceRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return {
    records,
    isLoading: query.isLoading,
    upsertAttendance,
    deleteAttendance,
    summary: { presentCount, absentCount, total: records.length, attendanceRate },
  };
};
