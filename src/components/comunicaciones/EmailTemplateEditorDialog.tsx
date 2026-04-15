import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Plus, X, Save } from 'lucide-react';
import type { EmailTemplate } from '@/hooks/use-email-templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSave: (data: Partial<EmailTemplate>) => void;
  saving?: boolean;
}

export const EmailTemplateEditorDialog = ({ open, onOpenChange, template, onSave, saving }: Props) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [variables, setVariables] = useState<{ key: string; label: string }[]>([]);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSystem = template?.category === 'system';
  const isNew = !template;

  useEffect(() => {
    if (open) {
      setName(template?.name || '');
      setSlug(template?.slug || '');
      setSubject(template?.subject || '');
      setDescription(template?.description || '');
      setHtmlContent(template?.html_content || '');
      setVariables(template?.variables || []);
      
      setNewVarKey('');
      setNewVarLabel('');
    }
  }, [open, template]);

  const insertVariable = (key: string) => {
    const tag = `{{${key}}}`;
    if (textareaRef.current) {
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = htmlContent.substring(0, start) + tag + htmlContent.substring(end);
      setHtmlContent(newContent);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      setHtmlContent(prev => prev + tag);
    }
  };

  const addVariable = () => {
    if (!newVarKey.trim()) return;
    setVariables(prev => [...prev, { key: newVarKey.trim(), label: newVarLabel.trim() || newVarKey.trim() }]);
    setNewVarKey('');
    setNewVarLabel('');
  };

  const removeVariable = (key: string) => {
    setVariables(prev => prev.filter(v => v.key !== key));
  };

  const handleSave = () => {
    onSave({
      id: template?.id,
      name,
      slug,
      subject,
      html_content: htmlContent,
      description: description || null,
      category: template?.category || 'custom',
      variables,
      status: template?.status || 'active',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isNew ? 'Crear Plantilla' : 'Editar Plantilla'}
            {isSystem && <Badge variant="secondary">Sistema</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isSystem && (
          <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-600 dark:text-yellow-400 text-sm">
              Los cambios en esta plantilla afectarán todos los envíos futuros de este tipo.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mi plantilla" />
          </div>
          <div className="space-y-1">
            <Label>Slug (identificador)</Label>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="mi-plantilla"
              disabled={isSystem}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Asunto</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del correo" />
        </div>

        <div className="space-y-1">
          <Label>Descripción</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve" />
        </div>

        {/* Variables */}
        <div className="space-y-2">
          <Label>Variables disponibles</Label>
          <div className="flex flex-wrap gap-1.5">
            {variables.map(v => (
              <Badge
                key={v.key}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 gap-1"
                onClick={() => insertVariable(v.key)}
              >
                {`{{${v.key}}}`}
                {!isSystem && (
                  <X
                    className="h-3 w-3 ml-1 hover:text-destructive"
                    onClick={e => { e.stopPropagation(); removeVariable(v.key); }}
                  />
                )}
              </Badge>
            ))}
          </div>
          {!isSystem && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Key</Label>
                <Input value={newVarKey} onChange={e => setNewVarKey(e.target.value)} placeholder="nombre" className="h-8 text-sm" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Etiqueta</Label>
                <Input value={newVarLabel} onChange={e => setNewVarLabel(e.target.value)} placeholder="Nombre del contacto" className="h-8 text-sm" />
              </div>
              <Button size="sm" variant="outline" onClick={addVariable} disabled={!newVarKey.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Side-by-side editor and preview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Código HTML</Label>
            <Textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              className="min-h-[400px] font-mono text-xs leading-relaxed"
              placeholder="<html>...</html>"
            />
          </div>
          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="border rounded-md overflow-hidden bg-white min-h-[400px]">
              <iframe
                srcDoc={htmlContent}
                className="w-full min-h-[400px] border-0"
                sandbox="allow-same-origin"
                title="Preview"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name || !slug || !subject}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
