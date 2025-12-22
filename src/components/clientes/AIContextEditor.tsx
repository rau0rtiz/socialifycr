import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIContextEditorProps {
  clientId: string;
  initialContext: string | null;
  onUpdate?: () => void;
}

export const AIContextEditor = ({ clientId, initialContext, onUpdate }: AIContextEditorProps) => {
  const [context, setContext] = useState(initialContext || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setContext(initialContext || '');
    setHasChanges(false);
  }, [initialContext, clientId]);

  const handleChange = (value: string) => {
    setContext(value);
    setHasChanges(value !== (initialContext || ''));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('clients')
      .update({ 
        ai_context: context || null,
        updated_at: new Date().toISOString()
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
      setHasChanges(false);
      onUpdate?.();
    }
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Contexto de IA</Label>
        </div>
        {hasChanges && (
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving}
            className="h-7 text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Guardar
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Describe el enfoque del cliente, su audiencia, estilo de contenido y objetivos. 
        Esta información ayuda a la IA a generar insights y recomendaciones más relevantes.
      </p>
      
      <Textarea
        value={context}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Ej: Creador de contenido enfocado en tecnología y gadgets. Audiencia joven (18-35), principalmente hispanohablante. Estilo informal y educativo. Objetivo: crecer comunidad para lanzar productos digitales."
        className="min-h-[120px] text-sm resize-none"
      />
      
      {context && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Contexto activo: {context.length} caracteres
        </div>
      )}
    </div>
  );
};
