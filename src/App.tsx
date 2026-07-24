import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getHostMode } from "@/lib/host-mode";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { BrandProvider } from "@/contexts/BrandContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { SellerHomeGate } from "@/components/SellerHomeGate";
import { Loader2 } from 'lucide-react';
import MindCoachMasterclass from "./pages/MindCoachMasterclass";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BrandSettings = lazy(() => import("./pages/BrandSettings"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Ventas = lazy(() => import("./pages/Ventas"));
const Ordenes = lazy(() => import("./pages/Ordenes"));
const SpeakUpReportes = lazy(() => import("./pages/SpeakUpReportes"));

const Historial = lazy(() => import("./pages/Historial"));
const Auth = lazy(() => import("./pages/Auth"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Invitacion = lazy(() => import("./pages/Invitacion"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ImageDB = lazy(() => import("./pages/ImageDB"));
const Archivos = lazy(() => import("./pages/Archivos"));
const Accesos = lazy(() => import("./pages/Accesos"));
const BusinessSetup = lazy(() => import("./pages/BusinessSetup"));
const ClientDatabase = lazy(() => import("./pages/ClientDatabase"));


const ActualizarFoto = lazy(() => import("./pages/ActualizarFoto"));
const Funnel = lazy(() => import("./pages/Funnel"));
const AgencyLeads = lazy(() => import("./pages/AgencyLeads"));
const Comunicaciones = lazy(() => import("./pages/Comunicaciones"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Comisiones = lazy(() => import("./pages/Comisiones"));
const AdFrameworks = lazy(() => import("./pages/AdFrameworks"));
const AdFrameworkDetail = lazy(() => import("./pages/AdFrameworkDetail"));
const AdCampaignCanvas = lazy(() => import("./pages/AdCampaignCanvas"));
const AgencyCRM = lazy(() => import("./pages/AgencyCRM"));
const Producciones = lazy(() => import("./pages/Producciones"));
const ProduccionSheet = lazy(() => import("./pages/ProduccionSheet"));
const ProduccionPublica = lazy(() => import("./pages/ProduccionPublica"));
const SellerCrm = lazy(() => import("./pages/SellerCrm"));
const Propuestas = lazy(() => import("./pages/Propuestas"));
const PropuestaPublica = lazy(() => import("./pages/PropuestaPublica"));
const AgencyResumen = lazy(() => import("./pages/agencia/Resumen"));
const AgencyPagos = lazy(() => import("./pages/agencia/Pagos"));

const ImageDBPinGate = lazy(() => import("./pages/ImageDB").then(m => ({ default: m.ImageDBPinGate })));
const MetaOAuthCallback = lazy(() => import("./pages/MetaOAuthCallback").then(m => ({ default: m.MetaOAuthCallback })));
const YouTubeOAuthCallback = lazy(() => import("./pages/YouTubeOAuthCallback").then(m => ({ default: m.YouTubeOAuthCallback })));
const TikTokOAuthCallback = lazy(() => import("./pages/TikTokOAuthCallback").then(m => ({ default: m.TikTokOAuthCallback })));
const LinkedInOAuthCallback = lazy(() => import("./pages/LinkedInOAuthCallback").then(m => ({ default: m.LinkedInOAuthCallback })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — reduce refetches on navigation
      gcTime: 15 * 60 * 1000,   // 15 minutes — keep cache longer across page switches
      refetchOnWindowFocus: false,
      refetchOnMount: false,     // Don't refetch if data is still fresh
      retry: 1,
    },
  },
});

// Empty fallback — keeps the previous page visible while the next route's chunk loads.
// Page-level skeletons handle their own loading states.
const PageLoader = () => null;

const MODULE_LOAD_RETRY_KEY = "__lovable_module_retry_count__";
const MAX_MODULE_RETRIES = 4;

const isModuleLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|module script|Load failed/i.test(message);
};

const settleTasks = (tasks: Array<Promise<unknown>>) =>
  Promise.all(tasks.map((task) => Promise.resolve(task).catch(() => undefined)));

const clearRuntimeCaches = async () => {
  const tasks: Promise<unknown>[] = [];

  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          settleTasks(registrations.map((registration) => registration.unregister())),
        ),
    );
  }

  if ("caches" in window && window.caches.keys) {
    tasks.push(
      window.caches
        .keys()
        .then((keys) => settleTasks(keys.map((key) => window.caches.delete(key)))),
    );
  }

  await settleTasks(tasks);
};

const reloadWithCacheBust = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("__reload", String(Date.now()));
  window.location.replace(url.toString());
};

class ChunkLoadErrorBoundary extends Component<{ children: ReactNode }, { recovering: boolean; failed: boolean }> {
  state = { recovering: false, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return isModuleLoadError(error) ? { recovering: true, failed: false } : { recovering: false, failed: true };
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    if (!isModuleLoadError(error)) return;

    const retryCount = Number(sessionStorage.getItem(MODULE_LOAD_RETRY_KEY) || "0");
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, String(retryCount + 1));

    if (retryCount >= MAX_MODULE_RETRIES) {
      reloadWithCacheBust();
      return;
    }

    void clearRuntimeCaches().finally(reloadWithCacheBust);
  }

  render() {
    if (this.state.recovering) return <PageLoader />;
    if (this.state.failed) return <NotFound />;
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <BrandProvider>
              <Toaster />
              <Sonner />
              <ChunkLoadErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  {getHostMode() === 'producciones' ? (
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/accept-invite" element={<AcceptInvite />} />
                    <Route path="/invitacion/:token" element={<Invitacion />} />
                    <Route path="/oauth/meta/callback" element={<MetaOAuthCallback />} />
                    <Route path="/oauth/youtube/callback" element={<YouTubeOAuthCallback />} />
                    <Route path="/oauth/tiktok/callback" element={<TikTokOAuthCallback />} />
                    <Route path="/oauth/linkedin/callback" element={<LinkedInOAuthCallback />} />
                    <Route path="/produccion-publica/:token" element={<ProduccionPublica />} />
                    <Route path="/privacidad" element={<Privacy />} />
                    <Route path="/terminos" element={<Terms />} />
                    <Route path="/eliminar-datos" element={<DataDeletion />} />
                    <Route path="/" element={<Navigate to="/producciones" replace />} />
                    <Route path="/producciones" element={
                      <ProtectedRoute>
                        <RoleProtectedRoute requireAgency>
                          <Producciones />
                        </RoleProtectedRoute>
                      </ProtectedRoute>
                    } />
                    <Route path="/producciones/:sheetId" element={
                      <ProtectedRoute>
                        <RoleProtectedRoute requireAgency>
                          <ProduccionSheet />
                        </RoleProtectedRoute>
                      </ProtectedRoute>
                    } />
                    {/* Legacy paths from main host also work here */}
                    <Route path="/agencia/producciones" element={<Navigate to="/producciones" replace />} />
                    <Route path="/agencia/producciones/:sheetId" element={<Navigate to="/producciones" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  ) : (
                  <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/invitacion/:token" element={<Invitacion />} />
                  <Route path="/produccion-publica/:token" element={<ProduccionPublica />} />
                  <Route path="/propuesta/:slug" element={<PropuestaPublica />} />
                  <Route path="/reporte/:slug" element={<PropuestaPublica />} />
                  <Route path="/plan/:slug" element={<PropuestaPublica />} />
                  <Route path="/privacidad" element={<Privacy />} />
                  <Route path="/terminos" element={<Terms />} />
                  <Route path="/eliminar-datos" element={<DataDeletion />} />
                  <Route path="/" element={<ProtectedRoute><SellerHomeGate /></ProtectedRoute>} />
                  <Route path="/mis-leads" element={<ProtectedRoute><SellerCrm /></ProtectedRoute>} />
                  {/* Agency-only routes */}
                  <Route path="/brand-settings" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <BrandSettings />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/clientes" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Clientes />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/historial" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Historial />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/accesos" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireManage>
                        <Accesos />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/business-setup" element={<ProtectedRoute><BusinessSetup /></ProtectedRoute>} />
                  <Route path="/client-database" element={<ProtectedRoute><ClientDatabase /></ProtectedRoute>} />
                  <Route path="/agencia/crm" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <AgencyCRM />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/producciones" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Producciones />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/producciones/:sheetId" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <ProduccionSheet />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/documentacion" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Propuestas />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/propuestas" element={<Navigate to="/agencia/documentacion" replace />} />

                  {/* Agency hub — internal CRM Agencia */}
                  <Route path="/agencia" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <AgencyResumen />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/clientes" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Clientes />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/comunicaciones" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Comunicaciones />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/accesos" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireManage>
                        <Accesos />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/archivos" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Archivos />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agencia/ajustes" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <BrandSettings />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />

                  <Route path="/ad-frameworks" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <AdFrameworks />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/ad-frameworks/:id" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <AdFrameworkDetail />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/ad-frameworks/:id/campaigns/:campaignId" element={
                    <ProtectedRoute>
                      <AdCampaignCanvas />
                    </ProtectedRoute>
                  } />
                  <Route path="/masterclass" element={
                    <ProtectedRoute>
                      <MindCoachMasterclass />
                    </ProtectedRoute>
                  } />
                  <Route path="/image-db" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <ImageDB />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/archivos" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Archivos />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  {/* External PIN-protected image DB */}
                  <Route path="/imgdb" element={<ImageDBPinGate />} />
                  {/* Shared routes */}
                  <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
                  <Route path="/ordenes" element={<ProtectedRoute><Ordenes /></ProtectedRoute>} />
                  <Route path="/reportes" element={<ProtectedRoute><SpeakUpReportes /></ProtectedRoute>} />
                  
                  <Route path="/comisiones" element={<ProtectedRoute><Comisiones /></ProtectedRoute>} />
                  <Route path="/actualizar-foto" element={<ProtectedRoute><ActualizarFoto /></ProtectedRoute>} />
                  <Route path="/roadmap" element={<Funnel />} />
                  <Route path="/comunicaciones" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Comunicaciones />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/agency-leads" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Comunicaciones />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/desuscribirse" element={<Unsubscribe />} />
                  <Route path="/oauth/meta/callback" element={<MetaOAuthCallback />} />
                  <Route path="/oauth/youtube/callback" element={<YouTubeOAuthCallback />} />
                  <Route path="/oauth/tiktok/callback" element={<TikTokOAuthCallback />} />
                  <Route path="/oauth/linkedin/callback" element={<LinkedInOAuthCallback />} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                  )}
                </Suspense>
              </ChunkLoadErrorBoundary>
            </BrandProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
