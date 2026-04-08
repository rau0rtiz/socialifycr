import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBrand } from '@/contexts/BrandContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProductsManager } from '@/components/ventas/ProductsManager';
import { TeamMembers } from '@/components/clientes/TeamMembers';
import { PlatformConnections } from '@/components/clientes/PlatformConnections';
import { AIContextEditor } from '@/components/clientes/AIContextEditor';
import { ClientBanner } from '@/components/dashboard/ClientBanner';
import { Building2, Palette, Package, Users, Save, Loader2, Plug, ArrowLeft, Brain } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type Section = null | 'brand' | 'products' | 'team' | 'connections';

const SECTIONS = [
  {
    key: 'brand' as const,
    title: 'Marca',
    description: 'Logo, colores, banner y contexto AI',
    icon: Palette,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    key: 'products' as const,
    title: 'Productos',
    description: 'Catálogo de productos y servicios',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'team' as const,
    title: 'Equipo',
    description: 'Miembros con acceso a esta cuenta',
    icon: Users,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    key: 'connections' as const,
    title: 'Conexiones',
    description: 'Redes sociales y plataformas de anuncios',
    icon: Plug,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

const BusinessSetup = () => {
  const { selectedClient, clientsLoading } = useBrand();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>(null);

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState<string | null>(null);

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

  // ── Section content renderers ──────────────────────────────────
  const renderBrand = () => (
    <div className="space-y-6">
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
                <ColorPicker
                  value={primaryColor || '0 0% 0%'}
                  onChange={setPrimaryColor}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color Acento</Label>
                <ColorPicker
                  value={accentColor || '0 0% 0%'}
                  onChange={setAccentColor}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveBrand} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Marca
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Contexto AI
          </CardTitle>
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
    </div>
  );

  const renderProducts = () => (
    <ProductsManager clientId={selectedClient.id} />
  );

  const renderTeam = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Equipo</CardTitle>
        <CardDescription>Miembros con acceso a esta cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <TeamMembers clientId={selectedClient.id} clientName={selectedClient.name} />
      </CardContent>
    </Card>
  );

  const renderConnections = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plataformas Conectadas</CardTitle>
        <CardDescription>Conexiones activas con redes sociales y plataformas de anuncios</CardDescription>
      </CardHeader>
      <CardContent>
        <PlatformConnections clientId={selectedClient.id} />
      </CardContent>
    </Card>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    brand: renderBrand,
    products: renderProducts,
    team: renderTeam,
    connections: renderConnections,
  };

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          {activeSection && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setActiveSection(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {activeSection
                ? SECTIONS.find(s => s.key === activeSection)?.title
                : 'Business Setup'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeSection
                ? SECTIONS.find(s => s.key === activeSection)?.description
                : `Configuración integral de ${selectedClient.name}`}
            </p>
          </div>
        </div>

        {/* Grid or Section content */}
        {!activeSection ? (
          <div className="grid grid-cols-2 gap-4">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className="group text-left p-5 md:p-6 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-200"
              >
                <div className={`p-2.5 rounded-xl ${section.bgColor} w-fit mb-4`}>
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                </div>
                <h3 className="font-semibold text-foreground text-sm md:text-base">
                  {section.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {section.description}
                </p>
              </button>
            ))}
          </div>
        ) : (
          sectionRenderers[activeSection]?.()
        )}
      </div>
    </DashboardLayout>
  );
};

export default BusinessSetup;
