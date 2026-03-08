import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GammaFormat = 'presentation' | 'document';

export interface GammaGenerationStatus {
  generationId: string;
  status: 'pending' | 'completed' | 'failed';
  gammaUrl?: string;
  exportUrl?: string;
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
        toast.success('¡Reporte generado en Gamma!');
      } else if (data.status === 'failed') {
        stopPolling();
        setIsGenerating(false);
        toast.error('Error al generar el reporte en Gamma');
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
        },
      });

      if (error) throw error;

      const generationId = data.generationId;
      if (!generationId) throw new Error('No generationId returned');

      setGeneration({ generationId, status: 'pending' });

      // Poll every 5 seconds
      pollingRef.current = setInterval(() => pollStatus(generationId), 5000);
      // Also poll immediately after a short delay
      setTimeout(() => pollStatus(generationId), 3000);

    } catch (err) {
      console.error('Error generating Gamma report:', err);
      toast.error('Error al iniciar la generación en Gamma');
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
