import { Client } from '@/pages/Clientes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformConnections } from './PlatformConnections';
import { TeamMembers } from './TeamMembers';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Palette, Users, Link2, Calendar, ImageIcon, Save, Loader2 } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ClientDetailDialog = ({ 
  client, 
  open, 
  onOpenChange, 
  onUpdate 
}: ClientDetailDialogProps) => {
  const navigate = useNavigate();
  const { clientBrands, updateClientBrand, saveBrandSettings, hasUnsavedChanges } = useBrand();
  const [saving, setSaving] = useState(false);

  if (!client) return null;

  const handleViewDashboard = () => {
    onOpenChange(false);
    navigate(`/?preview=${client.id}`);
  };

  const brand = clientBrands[client.id] || { 
    logoUrl: client.logo_url || '',
    primaryColor: client.primary_color || '220 70% 50%',
    accentColor: client.accent_color || '262 83% 58%', 
    secondaryColor: '199 89% 48%'
  };

  const handleSaveBrand = async () => {
    setSaving(true);
    try {
      await saveBrandSettings();
      toast({
        title: "Marca guardada",
        description: "Los cambios de marca se han guardado correctamente.",
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header with gradient background */}
        <div 
          className="relative p-6 pb-16"
          style={{ 
            background: `linear-gradient(135deg, hsl(${brand.primaryColor}) 0%, hsl(${brand.accentColor}) 100%)` 
          }}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {brand.logoUrl ? (
                  <div className="h-16 w-16 rounded-xl bg-background/90 backdrop-blur-sm p-2 shadow-lg">
                    <img
                      src={brand.logoUrl}
                      alt={client.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-background/90 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-lg">
                    {client.name.charAt(0)}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-2xl font-bold text-white drop-shadow-sm">
                    {client.name}
                  </DialogTitle>
                  {client.industry && (
                    <Badge variant="secondary" className="mt-1 bg-background/20 text-white border-0 backdrop-blur-sm">
                      {client.industry}
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleViewDashboard}
                className="bg-background/20 hover:bg-background/30 text-white border-0 backdrop-blur-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Dashboard
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Content area with tabs */}
        <div className="px-6 pb-6 -mt-10 relative z-10">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Palette className="h-4 w-4" />
                <span className="text-xs font-medium">Colores</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="h-8 w-8 rounded-lg border shadow-sm"
                  style={{ backgroundColor: `hsl(${brand.primaryColor})` }}
                  title="Primario"
                />
                <div
                  className="h-8 w-8 rounded-lg border shadow-sm"
                  style={{ backgroundColor: `hsl(${brand.accentColor})` }}
                  title="Acento"
                />
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Creado</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(client.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Link2 className="h-4 w-4" />
                <span className="text-xs font-medium">ID</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground truncate" title={client.id}>
                {client.id.slice(0, 8)}...
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="connections" className="gap-2">
                <Link2 className="h-4 w-4" />
                Conexiones
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                Equipo
              </TabsTrigger>
              <TabsTrigger value="brand" className="gap-2">
                <Palette className="h-4 w-4" />
                Marca
              </TabsTrigger>
            </TabsList>
            
            <div className="bg-muted/30 rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <TabsContent value="connections" className="mt-0">
                <PlatformConnections clientId={client.id} />
              </TabsContent>
              
              <TabsContent value="team" className="mt-0">
                <TeamMembers clientId={client.id} clientName={client.name} />
              </TabsContent>

              <TabsContent value="brand" className="mt-0 space-y-4">
                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vista previa en tiempo real</Label>
                  <div 
                    className="rounded-xl p-4 border overflow-hidden transition-all duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, hsl(${brand.primaryColor}) 0%, hsl(${brand.accentColor}) 100%)` 
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-background/90 backdrop-blur-sm p-1.5 shadow-lg flex items-center justify-center">
                        {brand.logoUrl ? (
                          <img 
                            src={brand.logoUrl} 
                            alt="Preview" 
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-lg font-bold">{client.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white drop-shadow-sm">{client.name}</p>
                        <div className="flex gap-1.5 mt-1">
                          <div 
                            className="h-4 w-4 rounded border border-white/30"
                            style={{ backgroundColor: `hsl(${brand.primaryColor})` }}
                          />
                          <div 
                            className="h-4 w-4 rounded border border-white/30"
                            style={{ backgroundColor: `hsl(${brand.accentColor})` }}
                          />
                          <div 
                            className="h-4 w-4 rounded border border-white/30"
                            style={{ backgroundColor: `hsl(${brand.secondaryColor})` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Logo del cliente</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden flex-shrink-0">
                      {brand.logoUrl ? (
                        <img 
                          src={brand.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <Input 
                      placeholder="https://ejemplo.com/logo.png"
                      value={brand.logoUrl} 
                      onChange={(e) => updateClientBrand(client.id, { ...brand, logoUrl: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Color Primario</Label>
                    <ColorPicker 
                      value={brand.primaryColor} 
                      onChange={(color) => updateClientBrand(client.id, { ...brand, primaryColor: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Color Acento</Label>
                    <ColorPicker 
                      value={brand.accentColor} 
                      onChange={(color) => updateClientBrand(client.id, { ...brand, accentColor: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Color Secundario</Label>
                    <ColorPicker 
                      value={brand.secondaryColor} 
                      onChange={(color) => updateClientBrand(client.id, { ...brand, secondaryColor: color })}
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSaveBrand} 
                    disabled={!hasUnsavedChanges || saving}
                    size="sm"
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Marca
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};