import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  description: string | null;
  category: string;
  variables: { key: string; label: string }[];
  status: string;
  created_at: string;
  updated_at: string;
}

export const useEmailTemplates = () => {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpsertEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id?: string }) => {
      if (template.id) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: template.name,
            slug: template.slug,
            subject: template.subject,
            html_content: template.html_content,
            description: template.description,
            variables: template.variables as any,
            status: template.status,
          })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: template.name!,
            slug: template.slug!,
            subject: template.subject!,
            html_content: template.html_content!,
            description: template.description,
            category: template.category || 'custom',
            variables: template.variables as any || [],
            status: template.status || 'active',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Plantilla guardada');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Plantilla eliminada');
    },
    onError: (e: any) => toast.error(e.message),
  });
};
