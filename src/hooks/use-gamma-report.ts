import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export type GammaFormat = 'presentation' | 'document';

export interface GammaTheme {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

export interface GammaGenerationStatus {
  generationId: string;
  status: 'pending' | 'completed' | 'failed';
  gammaUrl?: string;
  exportUrl?: string;
}

export function useGammaThemes() {
  return useQuery({
    queryKey: ['gamma-themes'],
    queryFn: async (): Promise<GammaTheme[]> => {
      const { data, error } = await supabase.functions.invoke('gamma-report', {
        body: { action: 'themes' },
      });

      if (error) throw error;
      // Gamma returns an array of theme objects
      const themes = Array.isArray(data) ? data : (data?.themes || []);
      return themes.map((t: any) => ({
        id: t.id || t.themeId,
        name: t.name || 'Sin nombre',
        thumbnailUrl: t.thumbnailUrl || t.thumbnail_url || null,
      }));
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}

export function useGammaReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generation, setGeneration] = useState<GammaGenerationStatus | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (generationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('gamma-report', {
        body: { action: 'status', generationId },
      });

      if (error) throw error;

      setGeneration({
        generationId,
        status: data.status,
        gammaUrl: data.gammaUrl,
        exportUrl: data.exportUrl,
      });

      if (data.status === 'completed') {
        stopPolling();
        setIsGenerating(false);
        toast.success('¡Reporte exportado a Gamma!');
      } else if (data.status === 'failed') {
        stopPolling();
        setIsGenerating(false);
        toast.error('Error al exportar a Gamma');
      }
    } catch (err) {
      console.error('Error polling Gamma status:', err);
    }
  }, [stopPolling]);

  const generate = useCallback(async (
    inputText: string,
    format: GammaFormat,
    additionalInstructions?: string,
    numCards?: number,
    themeId?: string,
  ) => {
    setIsGenerating(true);
    setGeneration(null);
    stopPolling();

    try {
      const { data, error } = await supabase.functions.invoke('gamma-report', {
        body: {
          action: 'generate',
          inputText,
          format,
          additionalInstructions,
          numCards,
          themeId,
        },
      });

      if (error) throw error;

      const generationId = data.generationId;
      if (!generationId) throw new Error('No generationId returned');

      setGeneration({ generationId, status: 'pending' });

      pollingRef.current = setInterval(() => pollStatus(generationId), 5000);
      setTimeout(() => pollStatus(generationId), 3000);

    } catch (err) {
      console.error('Error generating Gamma report:', err);
      toast.error('Error al iniciar la exportación a Gamma');
      setIsGenerating(false);
    }
  }, [pollStatus, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
    setGeneration(null);
  }, [stopPolling]);

  return {
    generate,
    isGenerating,
    generation,
    reset,
  };
}
