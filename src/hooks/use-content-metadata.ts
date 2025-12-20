import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContentTag {
  id: string;
  client_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContentModel {
  id: string;
  client_id: string;
  name: string;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentMetadata {
  id: string;
  client_id: string;
  post_id: string;
  tag_id: string | null;
  model_id: string | null;
  first_48h_views: number | null;
  first_48h_likes: number | null;
  first_48h_shares: number | null;
  first_48h_comments: number | null;
  first_48h_saves: number | null;
  first_48h_captured_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tag?: ContentTag;
  model?: ContentModel;
}

interface UseContentMetadataResult {
  tags: ContentTag[];
  models: ContentModel[];
  metadata: Record<string, ContentMetadata>;
  isLoading: boolean;
  createTag: (name: string, color: string) => Promise<ContentTag | null>;
  createModel: (name: string, photoUrl?: string, notes?: string) => Promise<ContentModel | null>;
  updateMetadata: (postId: string, updates: Partial<Pick<ContentMetadata, 'tag_id' | 'model_id'>>) => Promise<void>;
  capture48hMetrics: (postId: string, metrics: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    saves?: number;
  }) => Promise<void>;
  refetch: () => void;
}

export const useContentMetadata = (clientId: string | null): UseContentMetadataResult => {
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [models, setModels] = useState<ContentModel[]>([]);
  const [metadata, setMetadata] = useState<Record<string, ContentMetadata>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setTags([]);
      setModels([]);
      setMetadata({});
      return;
    }

    setIsLoading(true);

    try {
      // Fetch tags, models, and metadata in parallel
      const [tagsResult, modelsResult, metadataResult] = await Promise.all([
        supabase
          .from('content_tags')
          .select('*')
          .eq('client_id', clientId)
          .order('name'),
        supabase
          .from('content_models')
          .select('*')
          .eq('client_id', clientId)
          .order('name'),
        supabase
          .from('content_metadata')
          .select(`
            *,
            tag:content_tags(*),
            model:content_models(*)
          `)
          .eq('client_id', clientId),
      ]);

      if (tagsResult.error) throw tagsResult.error;
      if (modelsResult.error) throw modelsResult.error;
      if (metadataResult.error) throw metadataResult.error;

      setTags(tagsResult.data || []);
      setModels(modelsResult.data || []);

      // Convert metadata array to a map by post_id
      const metadataMap: Record<string, ContentMetadata> = {};
      (metadataResult.data || []).forEach((item: any) => {
        metadataMap[item.post_id] = item;
      });
      setMetadata(metadataMap);
    } catch (err) {
      console.error('Error fetching content metadata:', err);
      toast({
        title: 'Error al cargar metadatos',
        description: 'No se pudieron cargar las etiquetas y modelos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createTag = useCallback(async (name: string, color: string): Promise<ContentTag | null> => {
    if (!clientId) return null;

    try {
      const { data, error } = await supabase
        .from('content_tags')
        .insert({ client_id: clientId, name, color })
        .select()
        .single();

      if (error) throw error;

      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Etiqueta creada', description: `"${name}" ha sido añadida` });
      return data;
    } catch (err: any) {
      console.error('Error creating tag:', err);
      toast({
        title: 'Error al crear etiqueta',
        description: err.message || 'No se pudo crear la etiqueta',
        variant: 'destructive',
      });
      return null;
    }
  }, [clientId, toast]);

  const createModel = useCallback(async (name: string, photoUrl?: string, notes?: string): Promise<ContentModel | null> => {
    if (!clientId) return null;

    try {
      const { data, error } = await supabase
        .from('content_models')
        .insert({ 
          client_id: clientId, 
          name, 
          photo_url: photoUrl || null,
          notes: notes || null 
        })
        .select()
        .single();

      if (error) throw error;

      setModels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Modelo creado', description: `"${name}" ha sido añadido` });
      return data;
    } catch (err: any) {
      console.error('Error creating model:', err);
      toast({
        title: 'Error al crear modelo',
        description: err.message || 'No se pudo crear el modelo',
        variant: 'destructive',
      });
      return null;
    }
  }, [clientId, toast]);

  const updateMetadata = useCallback(async (
    postId: string,
    updates: Partial<Pick<ContentMetadata, 'tag_id' | 'model_id'>>
  ): Promise<void> => {
    if (!clientId) return;

    try {
      // Check if metadata exists for this post
      const existing = metadata[postId];

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('content_metadata')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('content_metadata')
          .insert({
            client_id: clientId,
            post_id: postId,
            ...updates,
          });

        if (error) throw error;
      }

      // Refetch to get updated data with joins
      await fetchData();
      toast({ title: 'Actualizado', description: 'Metadatos del post actualizados' });
    } catch (err: any) {
      console.error('Error updating metadata:', err);
      toast({
        title: 'Error al actualizar',
        description: err.message || 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    }
  }, [clientId, metadata, fetchData, toast]);

  const capture48hMetrics = useCallback(async (
    postId: string,
    metrics: {
      views?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      saves?: number;
    }
  ): Promise<void> => {
    if (!clientId) return;

    try {
      const existing = metadata[postId];
      const metricsData = {
        first_48h_views: metrics.views ?? null,
        first_48h_likes: metrics.likes ?? null,
        first_48h_shares: metrics.shares ?? null,
        first_48h_comments: metrics.comments ?? null,
        first_48h_saves: metrics.saves ?? null,
        first_48h_captured_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('content_metadata')
          .update(metricsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_metadata')
          .insert({
            client_id: clientId,
            post_id: postId,
            ...metricsData,
          });

        if (error) throw error;
      }

      await fetchData();
      toast({ title: 'Métricas guardadas', description: 'Las métricas de 48h han sido capturadas' });
    } catch (err: any) {
      console.error('Error capturing 48h metrics:', err);
      toast({
        title: 'Error al capturar métricas',
        description: err.message || 'No se pudieron guardar las métricas',
        variant: 'destructive',
      });
    }
  }, [clientId, metadata, fetchData, toast]);

  return {
    tags,
    models,
    metadata,
    isLoading,
    createTag,
    createModel,
    updateMetadata,
    capture48hMetrics,
    refetch: fetchData,
  };
};
