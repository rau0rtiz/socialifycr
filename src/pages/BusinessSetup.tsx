import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProductsManager } from '@/components/ventas/ProductsManager';
import { TeamMembers } from '@/components/clientes/TeamMembers';
import { PlatformConnections } from '@/components/clientes/PlatformConnections';
import { AIContextEditor } from '@/components/clientes/AIContextEditor';
import { ClientBanner } from '@/components/dashboard/ClientBanner';
import { Building2, Palette, Package, Users, Save, Loader2, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const BusinessSetup = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const queryClient = useQueryClient();

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState<string | null>(null);

  // Sync local state when client changes
  if (selectedClient && initialized !== selectedClient.id) {
    setLogoUrl(selectedClient.logo_url || '');
    setPrimaryColor(selectedClient.primary_color || '');
    setAccentColor(selectedClient.accent_color || '');
    setIndustry(selectedClient.industry || '');
    setInitialized(selectedClient.id);
  }

  const handleSaveBrand = async () => {
    if (!selectedClient) return;
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        logo_url: logoUrl || null,
        primary_color: primaryColor || null,
        accent_color: accentColor || null,
        industry: industry || null,
      })
      .eq('id', selectedClient.id);

    setSaving(false);
    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Marca actualizada');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  };

  const handleClientUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  if (clientsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Selecciona un cliente</CardTitle>
              <CardDescription>
                Selecciona un cliente del menú superior para configurar su negocio.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-8 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
            Business Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuración integral del negocio de {selectedClient.name}
          </p>
        </div>

        <Tabs defaultValue="brand" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="brand" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Marca
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              Conexiones
            </TabsTrigger>
          </TabsList>

          {/* ── Brand tab ─────────────────────────────── */}
          <TabsContent value="brand" className="space-y-6 mt-4">
            {/* Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Banner</CardTitle>
                <CardDescription>Imagen de portada del dashboard del cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientBanner
                  clientId={selectedClient.id}
                  bannerUrl={selectedClient.banner_url}
                  canEdit={true}
                  onBannerUpdate={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identidad de Marca</CardTitle>
                <CardDescription>Logo, colores e industria del cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>URL del Logo</Label>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="h-16 w-16 rounded-lg object-contain border mt-2"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Industria</Label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Ej: Coaching, E-commerce, SaaS..."
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Colores (HSL)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Color Primario</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded border shrink-0"
                          style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'transparent' }}
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="220 70% 50%"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Color Acento</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded border shrink-0"
                          style={{ backgroundColor: accentColor ? `hsl(${accentColor})` : 'transparent' }}
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="262 83% 58%"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveBrand} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Marca
                </Button>
              </CardContent>
            </Card>

            {/* AI Context */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contexto AI</CardTitle>
                <CardDescription>Información que la IA usa para generar contenido relevante</CardDescription>
              </CardHeader>
              <CardContent>
                <AIContextEditor
                  clientId={selectedClient.id}
                  initialContext={selectedClient.ai_context}
                  onUpdate={handleClientUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Products tab ──────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <ProductsManager clientId={selectedClient.id} />
          </TabsContent>

          {/* ── Team tab ──────────────────────────────── */}
          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equipo</CardTitle>
                <CardDescription>Miembros con acceso a esta cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamMembers clientId={selectedClient.id} clientName={selectedClient.name} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Connections tab ───────────────────────── */}
          <TabsContent value="connections" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plataformas Conectadas</CardTitle>
                <CardDescription>Conexiones activas con redes sociales y plataformas de anuncios</CardDescription>
              </CardHeader>
              <CardContent>
                <PlatformConnections clientId={selectedClient.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BusinessSetup;
