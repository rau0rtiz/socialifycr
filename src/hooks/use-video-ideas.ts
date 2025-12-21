import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface VideoIdea {
  id: string;
  client_id: string;
  url: string;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'twitter' | 'other';
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  tag_id: string | null;
  model_id: string | null;
  todos: TodoItem[];
  created_at: string;
  updated_at: string;
}

interface UseVideoIdeasResult {
  ideas: VideoIdea[];
  isLoading: boolean;
  error: string | null;
  addIdea: (idea: Omit<VideoIdea, 'id' | 'created_at' | 'updated_at' | 'todos'>) => Promise<VideoIdea | null>;
  updateIdea: (id: string, updates: Partial<VideoIdea>) => Promise<boolean>;
  deleteIdea: (id: string) => Promise<boolean>;
  refetch: () => void;
}

export const useVideoIdeas = (clientId: string | null): UseVideoIdeasResult => {
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchIdeas = useCallback(async () => {
    if (!clientId) {
      setIdeas([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('video_ideas')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Parse todos from JSONB
      const parsedIdeas = (data || []).map((idea: any) => ({
        ...idea,
        todos: Array.isArray(idea.todos) ? idea.todos : [],
      }));

      setIdeas(parsedIdeas);
    } catch (err) {
      console.error('Error fetching video ideas:', err);
      setError(err instanceof Error ? err.message : 'Error fetching ideas');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  const addIdea = async (idea: Omit<VideoIdea, 'id' | 'created_at' | 'updated_at' | 'todos'>): Promise<VideoIdea | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('video_ideas')
        .insert({
          client_id: idea.client_id,
          url: idea.url,
          platform: idea.platform,
          thumbnail_url: idea.thumbnail_url,
          title: idea.title,
          description: idea.description,
          tag_id: idea.tag_id,
          model_id: idea.model_id,
          todos: [],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newIdea: VideoIdea = {
        ...data,
        platform: data.platform as VideoIdea['platform'],
        todos: [],
      };
      setIdeas(prev => [newIdea, ...prev]);
      
      toast({
        title: 'Idea agregada',
        description: 'La idea de video se guardó correctamente',
      });

      return newIdea;
    } catch (err) {
      console.error('Error adding video idea:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la idea',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateIdea = async (id: string, updates: Partial<VideoIdea>): Promise<boolean> => {
    try {
      // Convert todos to JSON-compatible format for Supabase
      const dbUpdates: any = { ...updates };
      if (updates.todos) {
        dbUpdates.todos = updates.todos.map(t => ({ id: t.id, text: t.text, completed: t.completed }));
      }
      
      const { error: updateError } = await supabase
        .from('video_ideas')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setIdeas(prev => prev.map(idea => 
        idea.id === id ? { ...idea, ...updates } : idea
      ));

      return true;
    } catch (err) {
      console.error('Error updating video idea:', err);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la idea',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteIdea = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('video_ideas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setIdeas(prev => prev.filter(idea => idea.id !== id));
      
      toast({
        title: 'Idea eliminada',
        description: 'La idea se eliminó correctamente',
      });

      return true;
    } catch (err) {
      console.error('Error deleting video idea:', err);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la idea',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return {
    ideas,
    isLoading,
    error,
    addIdea,
    updateIdea,
    deleteIdea,
    refetch: fetchIdeas,
  };
};
