import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Paintbrush, Loader2, Copy, Download, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const FORMATS = [
  { value: 'post', label: 'Post (1080×1080)', width: 1080, height: 1080 },
  { value: 'story', label: 'Story (1080×1920)', width: 1080, height: 1920 },
  { value: 'landscape', label: 'Landscape (1920×1080)', width: 1920, height: 1080 },
  { value: 'carrusel', label: 'Carrusel (1080×1350)', width: 1080, height: 1350 },
];

const EXAMPLE_PROMPTS = [
  '5 tips para mejorar tu marketing digital, estilo moderno con gradiente azul-morado',
  'Estadística: "El 80% de las ventas vienen del 20% de los clientes" con diseño impactante',
  'Frase motivacional para emprendedores, estilo minimalista con tipografía grande',
  'Antes y después de una estrategia de redes sociales, formato comparativo',
];

const HtmlDesigner = () => {
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('post');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<Array<{ prompt: string; html: string; format: string }>>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedFormat = FORMATS.find(f => f.value === format) || FORMATS[0];
  const scale = expanded ? 1 : Math.min(600 / selectedFormat.width, 600 / selectedFormat.height);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Escribí una descripción del diseño');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-html-design', {
        body: { prompt: prompt.trim(), format: selectedFormat.label },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedHtml = data.html;
      if (!generatedHtml || !generatedHtml.includes('<')) {
        throw new Error('La IA no generó HTML válido');
      }

      setHtml(generatedHtml);
      setHistory(prev => [{ prompt: prompt.trim(), html: generatedHtml, format }, ...prev.slice(0, 9)]);
      toast.success('Diseño generado');
    } catch (err: any) {
      toast.error(err.message || 'Error generando diseño');
    } finally {
      setLoading(false);
    }
  }, [prompt, format, selectedFormat]);

  const handleCopyHtml = useCallback(() => {
    navigator.clipboard.writeText(html);
    toast.success('HTML copiado al portapapeles');
  }, [html]);

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diseno-${format}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('HTML descargado');
  }, [html, format]);

  const handleOpenFullscreen = useCallback(() => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [html]);

  return (
    <div className="space-y-4">
      {/* Prompt input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paintbrush className="h-5 w-5" />
            Generador de Diseños HTML
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Describí el diseño que querés y la IA lo genera en HTML listo para screenshot.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Textarea
              placeholder="Ej: Carousel de 5 tips de marketing con fondo gradiente azul oscuro, íconos y tipografía moderna..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] text-sm flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <div className="flex flex-col gap-2 sm:w-44 shrink-0">
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generando...' : 'Generar'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">⌘+Enter para generar</p>
            </div>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setPrompt(ex)}
              >
                {ex.slice(0, 50)}…
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {html && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Vista previa
                <Badge variant="secondary" className="text-[10px]">
                  {selectedFormat.width}×{selectedFormat.height}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopyHtml}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadHtml}>
                  <Download className="h-3.5 w-3.5" /> HTML
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleOpenFullscreen}>
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  Pantalla completa
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Abrí en pantalla completa → tomá screenshot con tu herramienta preferida
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="mx-auto border border-border rounded-lg overflow-hidden bg-muted/20"
              style={{
                width: selectedFormat.width * scale,
                height: selectedFormat.height * scale,
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={html}
                sandbox="allow-same-origin"
                className="border-0"
                style={{
                  width: selectedFormat.width,
                  height: selectedFormat.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
                title="HTML Design Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Historial de esta sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {history.map((item, i) => (
                <Badge
                  key={i}
                  variant={i === 0 ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer hover:bg-accent transition-colors max-w-[200px] truncate"
                  onClick={() => {
                    setHtml(item.html);
                    setFormat(item.format);
                    setPrompt(item.prompt);
                  }}
                >
                  {item.prompt.slice(0, 40)}…
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HtmlDesigner;
