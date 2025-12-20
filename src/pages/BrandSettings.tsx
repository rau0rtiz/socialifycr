import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { Button } from '@/components/ui/button';
import { useBrand } from '@/contexts/BrandContext';
import { Palette, Building2, ImageIcon, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const BrandSettings = () => {
  const { platformBrand, setPlatformBrand, clients, clientsLoading, clientBrands, updateClientBrand, saveBrandSettings, hasUnsavedChanges } = useBrand();

  const handleSave = () => {
    saveBrandSettings();
    toast({
      title: "Configuración guardada",
      description: "Los cambios de marca se han guardado correctamente.",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Configuración de Marca</h1>
            <p className="text-sm md:text-base text-muted-foreground">Personaliza la apariencia de Socialify y de cada cliente</p>
          </div>
          <Button onClick={handleSave} disabled={!hasUnsavedChanges} className="gap-2">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Guardar</span>
          </Button>
        </div>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList>
            <TabsTrigger value="platform" className="gap-2 text-xs md:text-sm">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Plataforma</span>
              <span className="sm:hidden">Platform</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 text-xs md:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
              <span className="sm:hidden">Clients</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Marca de Socialify</CardTitle>
                <CardDescription className="text-xs md:text-sm">Logo, colores y estilo general de la plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Logo de la plataforma</Label>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {platformBrand.logoUrl ? (
                        <img 
                          src={platformBrand.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input 
                        placeholder="https://ejemplo.com/logo.png"
                        value={platformBrand.logoUrl} 
                        onChange={(e) => setPlatformBrand({ ...platformBrand, logoUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Ingresa la URL de tu logo (PNG, JPG, SVG)</p>
                    </div>
                  </div>
                </div>

                {/* Name and colors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Nombre de la plataforma</Label>
                    <Input 
                      value={platformBrand.name} 
                      onChange={(e) => setPlatformBrand({ ...platformBrand, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Color primario</Label>
                    <ColorPicker 
                      value={platformBrand.primaryColor} 
                      onChange={(color) => setPlatformBrand({ ...platformBrand, primaryColor: color })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Color de acento</Label>
                    <ColorPicker 
                      value={platformBrand.accentColor} 
                      onChange={(color) => setPlatformBrand({ ...platformBrand, accentColor: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Color secundario</Label>
                    <ColorPicker 
                      value={platformBrand.secondaryColor} 
                      onChange={(color) => setPlatformBrand({ ...platformBrand, secondaryColor: color })}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-3">Vista previa</p>
                  <div className="flex items-center gap-3">
                    {platformBrand.logoUrl ? (
                      <img 
                        src={platformBrand.logoUrl} 
                        alt="Logo preview" 
                        className="w-10 h-10 rounded-lg object-contain"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: `hsl(${platformBrand.primaryColor})` }}
                      >
                        S
                      </div>
                    )}
                    <span className="font-semibold">{platformBrand.name}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${platformBrand.primaryColor})` }} />
                      <span className="text-xs text-muted-foreground">Primario</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${platformBrand.accentColor})` }} />
                      <span className="text-xs text-muted-foreground">Acento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${platformBrand.secondaryColor})` }} />
                      <span className="text-xs text-muted-foreground">Secundario</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <div className="space-y-4">
              {clientsLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Cargando clientes...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : clients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No tienes clientes todavía.</p>
                    <Button asChild variant="outline">
                      <Link to="/clientes">Crear Cliente</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                clients.map((client) => {
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
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BrandSettings;
