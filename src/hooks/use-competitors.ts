import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CompetitorPlatform = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin';

export interface Competitor {
  id: string;
  client_id: string;
  platform: CompetitorPlatform;
  username: string;
  display_name: string | null;
  profile_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NewCompetitor {
  platform: CompetitorPlatform;
  username: string;
  display_name?: string;
  profile_url?: string;
  notes?: string;
}

export const useCompetitors = (clientId: string | null) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCompetitors = useCallback(async () => {
    if (!clientId) {
      setCompetitors([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_competitors')
        .select('*')
        .eq('client_id', clientId)
        .order('platform', { ascending: true });

      if (error) throw error;
      setCompetitors((data as Competitor[]) || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const addCompetitor = async (competitor: NewCompetitor) => {
    if (!clientId) return null;

    try {
      const { data, error } = await supabase
        .from('client_competitors')
        .insert({
          client_id: clientId,
          platform: competitor.platform,
          username: competitor.username,
          display_name: competitor.display_name || null,
          profile_url: competitor.profile_url || null,
          notes: competitor.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCompetitors(prev => [...prev, data as Competitor]);
      toast({
        title: 'Competidor agregado',
        description: `${competitor.username} fue agregado como competidor.`,
      });
      return data as Competitor;
    } catch (error: any) {
      console.error('Error adding competitor:', error);
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'Este competidor ya existe para esta plataforma.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo agregar el competidor.',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const updateCompetitor = async (id: string, updates: Partial<NewCompetitor>) => {
    try {
      const { data, error } = await supabase
        .from('client_competitors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCompetitors(prev => prev.map(c => c.id === id ? (data as Competitor) : c));
      toast({
        title: 'Competidor actualizado',
      });
      return data as Competitor;
    } catch (error) {
      console.error('Error updating competitor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el competidor.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteCompetitor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client_competitors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCompetitors(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Competidor eliminado',
      });
      return true;
    } catch (error) {
      console.error('Error deleting competitor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el competidor.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    competitors,
    isLoading,
    addCompetitor,
    updateCompetitor,
    deleteCompetitor,
    refetch: fetchCompetitors,
  };
};
