import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Mail, Pencil, Send, Trash2, FileText } from 'lucide-react';
import { useEmailTemplates, useUpsertEmailTemplate, useDeleteEmailTemplate, type EmailTemplate } from '@/hooks/use-email-templates';
import { EmailTemplateEditorDialog } from './EmailTemplateEditorDialog';
import { SendCampaignDialog } from './SendCampaignDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const EmailTemplatesContent = () => {
  const { data: templates, isLoading } = useEmailTemplates();
  const upsert = useUpsertEmailTemplate();
  const deleteMut = useDeleteEmailTemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignTemplate, setCampaignTemplate] = useState<EmailTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEditor = (t: EmailTemplate | null) => {
    setEditingTemplate(t);
    setEditorOpen(true);
  };

  const openCampaign = (t: EmailTemplate) => {
    setCampaignTemplate(t);
    setCampaignOpen(true);
  };

  const handleSave = (data: Partial<EmailTemplate>) => {
    upsert.mutate(data, { onSuccess: () => setEditorOpen(false) });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const systemTemplates = templates?.filter(t => t.category === 'system' || t.category === 'transactional') || [];
  const customTemplates = templates?.filter(t => t.category === 'custom') || [];

  return (
    <div className="space-y-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Plantillas de Email</h2>
          <p className="text-sm text-muted-foreground">Gestiona las plantillas de correo del sistema y crea nuevas para marketing</p>
        </div>
        <Button onClick={() => openEditor(null)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Crear Plantilla
        </Button>
      </div>

      {/* System templates */}
      {systemTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plantillas del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={() => openEditor(t)}
                onSendCampaign={() => openCampaign(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plantillas Personalizadas</h3>
        {customTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">No hay plantillas personalizadas aún</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => openEditor(null)}>
                <Plus className="h-3 w-3" /> Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={() => openEditor(t)}
                onSendCampaign={() => openCampaign(t)}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EmailTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
        saving={upsert.isPending}
      />

      <SendCampaignDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        template={campaignTemplate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface TemplateCardProps {
  template: EmailTemplate;
  onEdit: () => void;
  onSendCampaign: () => void;
  onDelete?: () => void;
}

const TemplateCard = ({ template, onEdit, onSendCampaign, onDelete }: TemplateCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm leading-tight">{template.name}</p>
              <p className="text-xs text-muted-foreground">{template.slug}</p>
            </div>
          </div>
          <Badge variant={template.category === 'system' ? 'secondary' : 'outline'} className="text-[10px]">
            {template.category === 'system' ? 'Sistema' : 'Custom'}
          </Badge>
        </div>

        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        {/* Mini preview */}
        <div className="border rounded overflow-hidden bg-white h-24">
          <iframe
            srcDoc={template.html_content}
            className="w-full h-full border-0 pointer-events-none"
            sandbox=""
            title={template.name}
            style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
          />
        </div>

        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.variables.slice(0, 3).map(v => (
              <Badge key={v.key} variant="outline" className="text-[10px] font-mono">
                {`{{${v.key}}}`}
              </Badge>
            ))}
            {template.variables.length > 3 && (
              <Badge variant="outline" className="text-[10px]">+{template.variables.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onSendCampaign}>
            <Send className="h-3 w-3" /> Enviar
          </Button>
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplatesContent;
