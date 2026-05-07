import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentContact {
  id: string;
  client_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_id_number: string | null;
  guardian_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudentContactInput {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  id_number?: string | null;
  age?: number | null;
  gender?: string | null;
  notes?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_id_number?: string | null;
  guardian_email?: string | null;
  status?: string;
  billing_info?: any;
}

export const useStudentContacts = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['student-contacts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('student_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('full_name');
      if (error) throw error;
      return (data || []) as StudentContact[];
    },
    enabled: !!clientId,
  });

  const addStudent = useMutation({
    mutationFn: async (input: StudentContactInput) => {
      if (!clientId) throw new Error('No client');
      const { data, error } = await supabase
        .from('student_contacts')
        .insert({ client_id: clientId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as StudentContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contacts', clientId] });
    },
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, ...input }: StudentContactInput & { id: string }) => {
      const { error } = await supabase
        .from('student_contacts')
        .update(input)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contacts', clientId] });
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contacts', clientId] });
    },
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    addStudent,
    updateStudent,
    deleteStudent,
  };
};
