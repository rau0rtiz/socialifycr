import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data: links = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['crosspost-links', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('crosspost_links')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      return (data || []) as CrosspostLink[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const addLink = useCallback(async (primaryPostId: string, linkedPostId: string): Promise<boolean> => {
    if (!clientId) return false;

    try {
      const existing = links.find(
        l => (l.primary_post_id === primaryPostId && l.linked_post_id === linkedPostId) ||
             (l.primary_post_id === linkedPostId && l.linked_post_id === primaryPostId)
      );

      if (existing) {
        toast.info('Estos posts ya están vinculados');
        return false;
      }

      const { error: insertError } = await supabase
        .from('crosspost_links')
        .insert({
          client_id: clientId,
          primary_post_id: primaryPostId,
          linked_post_id: linkedPostId,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['crosspost-links', clientId] });
      toast.success('Posts vinculados correctamente');
      return true;
    } catch (err) {
      console.error('Error adding crosspost link:', err);
      toast.error('Error al vincular posts');
      return false;
    }
  }, [clientId, links, queryClient]);

  const removeLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crosspost_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['crosspost-links', clientId] });
      toast.success('Vínculo eliminado');
      return true;
    } catch (err) {
      console.error('Error removing crosspost link:', err);
      toast.error('Error al eliminar vínculo');
      return false;
    }
  }, [clientId, queryClient]);

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
    error: queryError?.message || null,
    addLink,
    removeLink,
    getLinkedPosts,
    refetch,
  };
};
