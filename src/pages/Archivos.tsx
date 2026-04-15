import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Trash2, FileText, Search, Download, Image, FolderOpen, Eye,
} from 'lucide-react';
import { ImageDBContent } from './ImageDB';

interface DocFile {
  name: string;
  fullPath: string;
  url: string;
  created_at: string;
  size: number;
  isPdf: boolean;
}

const PDFThumbnail = ({ onClick }: { url: string; name: string; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all group cursor-pointer flex flex-col items-center justify-center gap-2"
    >
      <FileText className="h-8 w-8 text-red-400" />
      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">PDF</span>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
      </div>
    </button>
  );
};

const FileIcon = ({ name, onClick }: { name: string; onClick: () => void }) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    doc: 'bg-blue-500', docx: 'bg-blue-500',
    xls: 'bg-green-600', xlsx: 'bg-green-600', csv: 'bg-green-600',
    ppt: 'bg-orange-500', pptx: 'bg-orange-500',
    txt: 'bg-gray-400',
  };
  const bg = colors[ext] || 'bg-muted-foreground';

  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-[3/4] rounded-lg border border-border overflow-hidden bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all group cursor-pointer flex flex-col items-center justify-center gap-2"
    >
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
        <FileText className="h-6 w-6 text-white" />
      </div>
      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        .{ext}
      </span>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  );
};

const PreviewDialog = ({ doc, open, onClose, onDelete }: { doc: DocFile | null; open: boolean; onClose: () => void; onDelete: (path: string) => void }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const fetchBlob = useCallback(async (url: string) => {
    setLoading(true);
    setBlobUrl(null);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setBlobUrl(objUrl);
    } catch {
      setBlobUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch blob when doc changes
  if (open && doc && !blobUrl && !loading) {
    fetchBlob(doc.url);
  }

  // Cleanup blob URL when dialog closes
  if (!open && blobUrl) {
    URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
  }

  const handleDownload = useCallback(async () => {
    if (!doc) return;
    try {
      const res = await fetch(doc.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name.replace(/^\d+-/, '').replace(/_/g, ' ');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(doc.url, '_blank');
    }
  }, [doc]);

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (blobUrl) URL.revokeObjectURL(blobUrl); setBlobUrl(null); onClose(); } }}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0" aria-describedby={undefined}>
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-medium truncate pr-4">{doc.name.replace(/^\d+-/, '').replace(/_/g, ' ')}</DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Descargar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => { onDelete(doc.fullPath); onClose(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {doc.isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={doc.name}
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <p className="text-sm">Cargando documento...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <FileText className="h-16 w-16 opacity-30" />
              <p className="text-sm">{doc.isPdf ? 'No se pudo cargar el PDF' : 'Vista previa no disponible'}</p>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar archivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DocumentsManager = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocFile | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['archivos-documents'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('content-images')
        .list('documents', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      return (data || []).filter(f => f.id).map(f => {
        const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(`documents/${f.name}`);
        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        return {
          name: f.name,
          fullPath: `documents/${f.name}`,
          url: urlData.publicUrl,
          created_at: f.created_at || '',
          size: (f.metadata as any)?.size || 0,
          isPdf,
        };
      });
    },
  });

  const filtered = (documents || []).filter(d =>
    !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      const sanitized = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${sanitized}`;
      const { error } = await supabase.storage.from('content-images').upload(`documents/${fileName}`, file, {
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) {
        toast.error(`Error subiendo ${file.name}: ${error.message}`);
      } else {
        count++;
      }
    }
    if (count > 0) {
      toast.success(`${count} archivo${count > 1 ? 's' : ''} subido${count > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['archivos-documents'] });
    }
    setUploading(false);
    e.target.value = '';
  }, [queryClient]);

  const deleteDoc = useMutation({
    mutationFn: async (fullPath: string) => {
      const { error } = await supabase.storage.from('content-images').remove([fullPath]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Archivo eliminado');
      queryClient.invalidateQueries({ queryKey: ['archivos-documents'] });
    },
    onError: () => toast.error('Error eliminando archivo'),
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Strip the timestamp prefix for display
  const displayName = (name: string) => {
    const match = name.match(/^\d+-(.+)$/);
    return match ? match[1].replace(/_/g, ' ') : name;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button size="sm" className="h-8 text-xs relative" disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploading ? 'Subiendo...' : 'Subir'}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-full aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay documentos</p>
              <p className="text-xs mt-1">Sube archivos PDF, Word, Excel y más.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((doc) => (
                <div key={doc.fullPath} className="space-y-2 group">
                  {doc.isPdf ? (
                    <PDFThumbnail url={doc.url} name={doc.name} onClick={() => setPreviewDoc(doc)} />
                  ) : (
                    <FileIcon name={doc.name} onClick={() => setPreviewDoc(doc)} />
                  )}
                  <div className="px-0.5">
                    <p className="text-xs font-medium truncate" title={displayName(doc.name)}>
                      {displayName(doc.name)}
                    </p>
                    {doc.size > 0 && (
                      <p className="text-[10px] text-muted-foreground">{formatSize(doc.size)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} archivo{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <PreviewDialog
        doc={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDelete={(path) => deleteDoc.mutate(path)}
      />
    </>
  );
};

const Archivos = () => {
  return (
    <DashboardLayout>
      <Tabs defaultValue="imagenes" className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Archivos</h1>
          <TabsList>
            <TabsTrigger value="imagenes" className="text-xs gap-1.5">
              <Image className="h-3.5 w-3.5" />
              Imágenes
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documentos
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="imagenes">
          <ImageDBContent />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentsManager />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Archivos;
