import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { BrandProvider } from "@/contexts/BrandContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { Loader2 } from 'lucide-react';

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BrandSettings = lazy(() => import("./pages/BrandSettings"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Ventas = lazy(() => import("./pages/Ventas"));

const Historial = lazy(() => import("./pages/Historial"));
const Auth = lazy(() => import("./pages/Auth"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Invitacion = lazy(() => import("./pages/Invitacion"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ImageDB = lazy(() => import("./pages/ImageDB"));
const Archivos = lazy(() => import("./pages/Archivos"));
const Accesos = lazy(() => import("./pages/Accesos"));
const BusinessSetup = lazy(() => import("./pages/BusinessSetup"));
const ClientDatabase = lazy(() => import("./pages/ClientDatabase"));
const WidgetCatalogPage = lazy(() => import("./pages/WidgetCatalog"));
const Asistencia = lazy(() => import("./pages/Asistencia"));
const ActualizarFoto = lazy(() => import("./pages/ActualizarFoto"));
const Funnel = lazy(() => import("./pages/Funnel"));
const AgencyLeads = lazy(() => import("./pages/AgencyLeads"));
const Comunicaciones = lazy(() => import("./pages/Comunicaciones"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Comisiones = lazy(() => import("./pages/Comisiones"));

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

const PageLoader = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <BrandProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/invitacion/:token" element={<Invitacion />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
                  <Route path="/widget-catalog" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <WidgetCatalogPage />
                      </RoleProtectedRoute>
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
                  <Route path="/asistencia" element={<ProtectedRoute><Asistencia /></ProtectedRoute>} />
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
              </Suspense>
            </BrandProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
