import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Copy, Download, RefreshCw, Wand2, FileText, TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCampaigns } from '@/hooks/use-ads-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIReportGeneratorProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

const reportTemplates = [
  {
    id: 'performance',
    title: 'Análisis de Rendimiento',
    description: 'Analiza el rendimiento de las campañas con métricas clave',
    icon: TrendingUp,
    prompt: 'Genera un análisis detallado del rendimiento de las campañas, incluyendo métricas de gasto, alcance, clics y conversiones. Identifica las campañas más exitosas y áreas de mejora.',
  },
  {
    id: 'optimization',
    title: 'Recomendaciones de Optimización',
    description: 'Obtén sugerencias para mejorar tus campañas',
    icon: Target,
    prompt: 'Basándote en los datos de las campañas, proporciona recomendaciones específicas para optimizar el presupuesto, mejorar el ROAS y reducir el costo por resultado.',
  },
  {
    id: 'executive',
    title: 'Resumen Ejecutivo',
    description: 'Reporte conciso para presentar a stakeholders',
    icon: FileText,
    prompt: 'Crea un resumen ejecutivo profesional de las campañas publicitarias, destacando los KPIs principales, logros y próximos pasos. Formato adecuado para presentar a directivos.',
  },
];

export const AIReportGenerator = ({ clientId, hasAdAccount }: AIReportGeneratorProps) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { data: campaignsResult, isLoading: campaignsLoading } = useCampaigns(
    clientId,
    hasAdAccount,
    'last_30d'
  );

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'USD';

  const generateReport = async (prompt: string) => {
    if (!clientId) {
      toast.error('Selecciona un cliente primero');
      return;
    }

    if (campaigns.length === 0) {
      toast.error('No hay datos de campañas disponibles');
      return;
    }

    setIsGenerating(true);
    setGeneratedReport('');

    try {
      const campaignData = campaigns.map((c) => ({
        name: c.name,
        status: c.effectiveStatus,
        spend: c.spend,
        reach: c.reach,
        clicks: c.clicks,
        results: c.results,
        resultType: c.resultType,
        costPerResult: c.costPerResult,
        roas: c.roas,
      }));

      const response = await supabase.functions.invoke('generate-report', {
        body: {
          prompt,
          campaignData,
          currency,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error generating report');
      }

      setGeneratedReport(response.data.report || 'No se pudo generar el reporte.');
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateClick = (template: (typeof reportTemplates)[0]) => {
    setSelectedTemplate(template.id);
    setCustomPrompt(template.prompt);
  };

  const handleGenerate = () => {
    if (customPrompt.trim()) {
      generateReport(customPrompt);
    } else {
      toast.error('Escribe una instrucción para generar el reporte');
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedReport);
    toast.success('Copiado al portapapeles');
  };

  const downloadReport = () => {
    const blob = new Blob([generatedReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado');
  };

  if (!hasAdAccount) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Conecta tu cuenta de anuncios</h3>
          <p className="text-muted-foreground">
            Para generar reportes con IA, primero necesitas conectar una cuenta de Meta Ads.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Panel - Input */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generador de Reportes
            </CardTitle>
            <CardDescription>
              Selecciona una plantilla o escribe instrucciones personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates */}
            <div className="grid gap-2">
              {reportTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="p-2 rounded-md bg-muted">
                    <template.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{template.title}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Instrucciones personalizadas</label>
              <Textarea
                placeholder="Describe qué tipo de reporte necesitas..."
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  setSelectedTemplate(null);
                }}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Campaign Summary */}
            {campaignsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary">{campaigns.length} campañas</Badge>
                <span className="text-xs text-muted-foreground">
                  Datos de los últimos 30 días disponibles
                </span>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !customPrompt.trim() || campaignsLoading}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar Reporte
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Output */}
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Reporte Generado</CardTitle>
          {generatedReport && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={downloadReport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-[400px]">
          {isGenerating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : generatedReport ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {generatedReport}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>El reporte generado aparecerá aquí</p>
              <p className="text-xs mt-1">Selecciona una plantilla o escribe instrucciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
