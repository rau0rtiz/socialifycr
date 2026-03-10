import { useState, useCallback, createContext, useContext } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, Copy, Trash2, Image, Search, ExternalLink, 
  FolderPlus, X, Check, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CORRECT_PIN = '6780';

// Context to pass PIN for unauthenticated access
const PinContext = createContext<string | null>(null);

const ImageDBContent = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const pin = useContext(PinContext);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Fetch all images from content-images bucket
  const { data: images, isLoading } = useQuery({
    queryKey: ['image-db-files'],
    queryFn: async () => {
      const { data: folders } = await supabase.storage
        .from('content-images')
        .list('imgdb', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      const allFiles: { name: string; folder: string; fullPath: string; url: string; created_at: string }[] = [];

      if (folders) {
        for (const item of folders) {
          if (item.id) {
            const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(`imgdb/${item.name}`);
            allFiles.push({
              name: item.name,
              folder: '',
              fullPath: `imgdb/${item.name}`,
              url: urlData.publicUrl,
              created_at: item.created_at || '',
            });
          } else {
            const { data: subFiles } = await supabase.storage
              .from('content-images')
              .list(`imgdb/${item.name}`, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
            
            if (subFiles) {
              for (const file of subFiles) {
                if (file.id) {
                  const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(`imgdb/${item.name}/${file.name}`);
                  allFiles.push({
                    name: file.name,
                    folder: item.name,
                    fullPath: `imgdb/${item.name}/${file.name}`,
                    url: urlData.publicUrl,
                    created_at: file.created_at || '',
                  });
                }
              }
            }
          }
        }
      }

      return allFiles;
    },
  });

  const folders = [...new Set((images || []).map(img => img.folder).filter(Boolean))];

  const filteredImages = (images || []).filter(img => {
    const matchesSearch = !searchTerm || img.name.toLowerCase().includes(searchTerm.toLowerCase()) || img.folder.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === null || img.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen`);
        continue;
      }
      
      const folder = selectedFolder || 'general';
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const path = `imgdb/${folder}/${fileName}`;

      if (pin) {
        // Use edge function for PIN-based access
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/imgdb-upload`, {
            method: 'POST',
            headers: { 'x-imgdb-pin': pin },
            body: formData,
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          successCount++;
        } catch (err: any) {
          toast.error(`Error subiendo ${file.name}: ${err.message}`);
        }
      } else {
        // Direct storage API for authenticated users
        const { error } = await supabase.storage.from('content-images').upload(path, file, {
          cacheControl: '31536000',
          upsert: false,
        });
        if (error) {
          toast.error(`Error subiendo ${file.name}: ${error.message}`);
        } else {
          successCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} imagen${successCount > 1 ? 'es' : ''} subida${successCount > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['image-db-files'] });
    }
    setUploading(false);
    e.target.value = '';
  }, [selectedFolder, queryClient, pin, supabaseUrl]);

  const deleteImage = useMutation({
    mutationFn: async (fullPath: string) => {
      if (pin) {
        const res = await fetch(`${supabaseUrl}/functions/v1/imgdb-upload`, {
          method: 'DELETE',
          headers: { 'x-imgdb-pin': pin, 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
      } else {
        const { error } = await supabase.storage.from('content-images').remove([fullPath]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Imagen eliminada');
      queryClient.invalidateQueries({ queryKey: ['image-db-files'] });
    },
    onError: () => toast.error('Error eliminando imagen'),
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  const createFolder = () => {
    if (!newFolder.trim()) return;
    setSelectedFolder(newFolder.trim().toLowerCase().replace(/\s+/g, '-'));
    setShowNewFolder(false);
    setNewFolder('');
    toast.success(`Carpeta "${newFolder}" creada. Sube una imagen para que aparezca.`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-5 w-5" />
              Image Database
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar imágenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowNewFolder(!showNewFolder)}
              >
                <FolderPlus className="h-3.5 w-3.5 mr-1" />
                Carpeta
              </Button>
              <Button size="sm" className="h-8 text-xs relative" disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploading ? 'Subiendo...' : 'Subir'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showNewFolder && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
              <Input
                placeholder="Nombre de la carpeta..."
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              />
              <Button size="sm" className="h-8" onClick={createFolder}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowNewFolder(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedFolder(null)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors border",
                selectedFolder === null
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              Todas
            </button>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder === selectedFolder ? null : folder)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors border",
                  selectedFolder === folder
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {folder}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay imágenes{selectedFolder ? ` en "${selectedFolder}"` : ''}</p>
              <p className="text-xs mt-1">Sube imágenes para generar links públicos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredImages.map((img) => (
                <div key={img.fullPath} className="group relative border border-border rounded-lg overflow-hidden bg-muted/20 hover:border-primary/50 transition-colors">
                  <div className="aspect-square">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => copyUrl(img.url)}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar URL
                      </Button>
                      <Button variant="secondary" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(img.url, '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => deleteImage.mutate(img.fullPath)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-medium truncate">{img.name}</p>
                    {img.folder && (
                      <Badge variant="outline" className="text-[8px] mt-0.5">{img.folder}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {filteredImages.length} imagen{filteredImages.length !== 1 ? 'es' : ''} • Clic en una imagen para copiar su URL pública
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// PIN-protected wrapper for external access
const ImageDBPinGate = () => {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [validPin, setValidPin] = useState('');

  const handlePinSubmit = () => {
    if (pin === CORRECT_PIN) {
      setAuthenticated(true);
      setValidPin(pin);
    } else {
      toast.error('PIN incorrecto');
      setPin('');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Image Database</CardTitle>
            <p className="text-sm text-muted-foreground">Ingresa el PIN para acceder</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="PIN de acceso"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <Button className="w-full" onClick={handlePinSubmit}>
                Acceder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PinContext.Provider value={validPin}>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <ImageDBContent />
      </div>
    </PinContext.Provider>
  );
};

// Main page for sidebar (authenticated users)
const ImageDB = () => {
  return (
    <DashboardLayout>
      <ImageDBContent />
    </DashboardLayout>
  );
};

export default ImageDB;
export { ImageDBPinGate };
