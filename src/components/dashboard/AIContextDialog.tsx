import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Save, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AIContextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  industry: string;
  initialContext: string | null;
  onUpdate?: (newContext: string) => void;
}

export const AIContextDialog = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  industry,
  initialContext,
  onUpdate,
}: AIContextDialogProps) => {
  const [context, setContext] = useState(initialContext || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setContext(initialContext || '');
    }
  }, [isOpen, initialContext]);

  const handleSave = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from('clients')
      .update({
        ai_context: context || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el contexto.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Contexto guardado',
        description: 'El contexto de IA ha sido actualizado.',
      });
      onUpdate?.(context);
      onClose();
    }

    setIsSaving(false);
  };

  const handlePolish = async () => {
    if (!context.trim()) {
      toast({
        title: 'Escribe algo primero',
        description: 'Agrega un borrador de contexto para que la IA lo pueda mejorar.',
        variant: 'destructive',
      });
      return;
    }

    setIsPolishing(true);

    try {
      const { data, error } = await supabase.functions.invoke('polish-context', {
        body: {
          context,
          clientName,
          industry,
        },
      });

      if (error) throw error;

      if (data?.polishedContext) {
        setContext(data.polishedContext);
        toast({
          title: 'Contexto mejorado',
          description: 'La IA ha refinado tu contexto. Revísalo y guarda si te parece bien.',
        });
      }
    } catch (error) {
      console.error('Error polishing context:', error);
      toast({
        title: 'Error',
        description: 'No se pudo mejorar el contexto. Intenta de nuevo.',
        variant: 'destructive',
      });
    }

    setIsPolishing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Contexto de IA para {clientName}
          </DialogTitle>
          <DialogDescription>
            Describe el enfoque, audiencia, estilo y objetivos del cliente. Esta información ayuda a generar insights más relevantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contexto</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePolish}
                disabled={isPolishing || !context.trim()}
                className="gap-1 text-xs"
              >
                {isPolishing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                Mejorar con IA
              </Button>
            </div>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={`Ej: ${clientName} es un creador de contenido enfocado en ${industry || 'su industria'}. 

Temas principales: ...
Audiencia objetivo: ...
Estilo de comunicación: ...
Objetivos: ...
Temas a evitar: ...`}
              className="min-h-[200px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {context.length} caracteres
            </p>
          </div>

          {context && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                <strong>Tip:</strong> Un buen contexto incluye: enfoque principal, temas clave, audiencia objetivo, 
                estilo de comunicación, objetivos a corto/mediano plazo, y temas a evitar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
