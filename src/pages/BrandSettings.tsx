import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { useBrand } from '@/contexts/BrandContext';
import { clients } from '@/data/mockData';
import { Palette, Building2 } from 'lucide-react';

const BrandSettings = () => {
  const { platformBrand, setPlatformBrand, clientBrands, updateClientBrand } = useBrand();

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Configuración de Marca</h1>
          <p className="text-sm md:text-base text-muted-foreground">Personaliza la apariencia de Socialify y de cada cliente</p>
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
                <CardDescription className="text-xs md:text-sm">Colores y estilo general de la plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      value={platformBrand.accentColor} 
                      onChange={(color) => setPlatformBrand({ ...platformBrand, accentColor: color })}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-2">Vista previa</p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: `hsl(${platformBrand.accentColor})` }}
                    >
                      S
                    </div>
                    <span className="font-semibold">{platformBrand.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <div className="space-y-4">
              {clients.map((client) => {
                const brand = clientBrands[client.id] || { accentColor: client.accentColor, secondaryColor: client.secondaryColor };
                
                return (
                  <Card key={client.id}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: `hsl(${brand.accentColor})` }}
                        >
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-sm md:text-base">{client.name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">{client.industry}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm">Color de acento</Label>
                          <ColorPicker 
                            value={brand.accentColor} 
                            onChange={(color) => updateClientBrand(client.id, { ...brand, accentColor: color })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Color secundario</Label>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BrandSettings;
