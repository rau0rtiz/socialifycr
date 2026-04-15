import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Trash2, FileText, Search, Download, Image, FolderOpen,
} from 'lucide-react';
import { ImageDBContent } from './ImageDB';

const DocumentsManager = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['archivos-documents'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('content-images')
        .list('documents', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      return (data || []).filter(f => f.id).map(f => {
        const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(`documents/${f.name}`);
        return {
          name: f.name,
          fullPath: `documents/${f.name}`,
          url: urlData.publicUrl,
          created_at: f.created_at || '',
          size: (f.metadata as any)?.size || 0,
        };
      });
    },
  });

  const filtered = (documents || []).filter(d =>
    !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
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
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay documentos</p>
            <p className="text-xs mt-1">Sube archivos PDF, Word, Excel y más.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((doc) => (
              <div
                key={doc.fullPath}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  {doc.size > 0 && (
                    <p className="text-[10px] text-muted-foreground">{formatSize(doc.size)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteDoc.mutate(doc.fullPath)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
