import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  Copy,
  Clock,
  TrendingUp,
  Target,
  Sparkles
} from 'lucide-react';
import { useSavedReports, useDeleteReport, SavedReport } from '@/hooks/use-saved-reports';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SavedReportsListProps {
  clientId: string | null;
}

const templateIcons: Record<string, typeof TrendingUp> = {
  performance: TrendingUp,
  optimization: Target,
  executive: FileText,
};

export const SavedReportsList = ({ clientId }: SavedReportsListProps) => {
  const { data: reports, isLoading } = useSavedReports(clientId);
  const deleteReport = useDeleteReport();
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  const handleDelete = async (report: SavedReport) => {
    if (!clientId) return;
    
    try {
      await deleteReport.mutateAsync({ reportId: report.id, clientId });
      toast.success('Reporte eliminado');
    } catch (error) {
      toast.error('Error al eliminar el reporte');
    }
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success('Copiado al portapapeles');
  };

  const downloadReport = (report: SavedReport) => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(report.created_at), 'yyyy-MM-dd')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado');
  };

  const getTemplateIcon = (templateType: string | null) => {
    const Icon = templateType ? templateIcons[templateType] || Sparkles : Sparkles;
    return Icon;
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecciona un cliente para ver los reportes guardados
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes Guardados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes Guardados
            {reports && reports.length > 0 && (
              <Badge variant="secondary" className="ml-2">{reports.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay reportes guardados</p>
              <p className="text-xs mt-1">Los reportes que generes aparecerán aquí</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {reports.map((report) => {
                  const Icon = getTemplateIcon(report.template_type);
                  return (
                    <div
                      key={report.id}
                      className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-md bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                          {report.template_type && (
                            <Badge variant="outline" className="text-[9px] px-1">
                              {report.template_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(report.content)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10"
                          onClick={() => handleDelete(report)}
                          disabled={deleteReport.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && (() => {
                const Icon = getTemplateIcon(selectedReport.template_type);
                return <Icon className="h-5 w-5" />;
              })()}
              {selectedReport?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {selectedReport && format(new Date(selectedReport.created_at), "d MMMM yyyy, HH:mm", { locale: es })}
          </div>
          <ScrollArea className="h-[50vh] mt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap pr-4">
              {selectedReport?.content}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => selectedReport && copyToClipboard(selectedReport.content)}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button variant="outline" onClick={() => selectedReport && downloadReport(selectedReport)}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
