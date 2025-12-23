import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CrosspostLink {
  id: string;
  client_id: string;
  primary_post_id: string;
  linked_post_id: string;
  created_at: string;
}

interface UseCrosspostLinksResult {
  links: CrosspostLink[];
  isLoading: boolean;
  error: string | null;
  addLink: (primaryPostId: string, linkedPostId: string) => Promise<boolean>;
  removeLink: (linkId: string) => Promise<boolean>;
  getLinkedPosts: (postId: string) => string[];
  refetch: () => void;
}

export const useCrosspostLinks = (clientId: string | null): UseCrosspostLinksResult => {
  const [links, setLinks] = useState<CrosspostLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!clientId) {
      setLinks([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('crosspost_links')
        .select('*')
        .eq('client_id', clientId);

      if (fetchError) throw fetchError;
      setLinks(data || []);
    } catch (err) {
      console.error('Error fetching crosspost links:', err);
      setError(err instanceof Error ? err.message : 'Error fetching links');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = useCallback(async (primaryPostId: string, linkedPostId: string): Promise<boolean> => {
    if (!clientId) return false;

    try {
      // Check if link already exists (in either direction)
      const existing = links.find(
        l => (l.primary_post_id === primaryPostId && l.linked_post_id === linkedPostId) ||
             (l.primary_post_id === linkedPostId && l.linked_post_id === primaryPostId)
      );

      if (existing) {
        toast.info('Estos posts ya están vinculados');
        return false;
      }

      const { data, error: insertError } = await supabase
        .from('crosspost_links')
        .insert({
          client_id: clientId,
          primary_post_id: primaryPostId,
          linked_post_id: linkedPostId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setLinks(prev => [...prev, data]);
      toast.success('Posts vinculados correctamente');
      return true;
    } catch (err) {
      console.error('Error adding crosspost link:', err);
      toast.error('Error al vincular posts');
      return false;
    }
  }, [clientId, links]);

  const removeLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crosspost_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success('Vínculo eliminado');
      return true;
    } catch (err) {
      console.error('Error removing crosspost link:', err);
      toast.error('Error al eliminar vínculo');
      return false;
    }
  }, []);

  const getLinkedPosts = useCallback((postId: string): string[] => {
    const linkedIds: string[] = [];
    
    for (const link of links) {
      if (link.primary_post_id === postId) {
        linkedIds.push(link.linked_post_id);
      } else if (link.linked_post_id === postId) {
        linkedIds.push(link.primary_post_id);
      }
    }
    
    return linkedIds;
  }, [links]);

  return {
    links,
    isLoading,
    error,
    addLink,
    removeLink,
    getLinkedPosts,
    refetch: fetchLinks,
  };
};
