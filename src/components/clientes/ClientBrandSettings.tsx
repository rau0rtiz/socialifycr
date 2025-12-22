import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/contexts/BrandContext';
import { ImageIcon, Save, Loader2, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
}

interface ClientBrandSettingsProps {
  clients: Client[];
  loading: boolean;
}

export const ClientBrandSettings = ({ clients, loading }: ClientBrandSettingsProps) => {
  const { clientBrands, updateClientBrand, saveBrandSettings, hasUnsavedChanges } = useBrand();

  const handleSave = () => {
    saveBrandSettings();
    toast({
      title: "Configuración guardada",
      description: "Los cambios de marca se han guardado correctamente.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando clientes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay clientes para configurar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Configuración de Marca</h3>
          <p className="text-sm text-muted-foreground">Personaliza colores y logos de cada cliente</p>
        </div>
        <Button onClick={handleSave} disabled={!hasUnsavedChanges} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </div>

      {clients.map((client) => {
        const brand = clientBrands[client.id] || { 
          logoUrl: client.logo_url || '',
          primaryColor: client.primary_color || '220 70% 50%',
          accentColor: client.accent_color || '262 83% 58%', 
          secondaryColor: '199 89% 48%'
        };
        
        return (
          <Card key={client.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                {brand.logoUrl ? (
                  <img 
                    src={brand.logoUrl} 
                    alt={client.name} 
                    className="w-10 h-10 rounded-lg object-contain"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: `hsl(${brand.accentColor})` }}
                  >
                    {client.name.charAt(0)}
                  </div>
                )}
                <div>
                  <CardTitle className="text-sm md:text-base">{client.name}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{client.industry}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client logo */}
              <div className="space-y-2">
                <Label className="text-sm">Logo del cliente</Label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {brand.logoUrl ? (
                      <img 
                        src={brand.logoUrl} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
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

              {/* Client colors */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm">Primario</Label>
                  <ColorPicker 
                    value={brand.primaryColor} 
                    onChange={(color) => updateClientBrand(client.id, { ...brand, primaryColor: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Acento</Label>
                  <ColorPicker 
                    value={brand.accentColor} 
                    onChange={(color) => updateClientBrand(client.id, { ...brand, accentColor: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Secundario</Label>
                  <ColorPicker 
                    value={brand.secondaryColor} 
                    onChange={(color) => updateClientBrand(client.id, { ...brand, secondaryColor: color })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
