import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const Contenido = lazy(() => import("./pages/Contenido"));
const Ventas = lazy(() => import("./pages/Ventas"));
const Facturacion = lazy(() => import("./pages/Facturacion"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Historial = lazy(() => import("./pages/Historial"));
const Auth = lazy(() => import("./pages/Auth"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Invitacion = lazy(() => import("./pages/Invitacion"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ImageDB = lazy(() => import("./pages/ImageDB"));
const Accesos = lazy(() => import("./pages/Accesos"));
const EmailMarketing = lazy(() => import("./pages/EmailMarketing"));
const GeneradorPautaPage = lazy(() => import("./pages/GeneradorPauta"));
const ImageDBPinGate = lazy(() => import("./pages/ImageDB").then(m => ({ default: m.ImageDBPinGate })));
const MetaOAuthCallback = lazy(() => import("./pages/MetaOAuthCallback").then(m => ({ default: m.MetaOAuthCallback })));
const YouTubeOAuthCallback = lazy(() => import("./pages/YouTubeOAuthCallback").then(m => ({ default: m.YouTubeOAuthCallback })));
const TikTokOAuthCallback = lazy(() => import("./pages/TikTokOAuthCallback").then(m => ({ default: m.TikTokOAuthCallback })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes — avoid refetching on every mount
      gcTime: 10 * 60 * 1000,   // 10 minutes — keep cache longer
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
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
                  <Route path="/facturacion" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <Facturacion />
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
                      <RoleProtectedRoute requireAgency>
                        <Accesos />
                      </RoleProtectedRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="/email-marketing" element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>} />
                  <Route path="/generador-pauta" element={
                    <ProtectedRoute>
                      <RoleProtectedRoute requireAgency>
                        <GeneradorPautaPage />
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
                  {/* External PIN-protected image DB */}
                  <Route path="/imgdb" element={<ImageDBPinGate />} />
                  {/* Shared routes */}
                  <Route path="/contenido" element={<ProtectedRoute><Contenido /></ProtectedRoute>} />
                  <Route path="/content" element={<ProtectedRoute><Contenido /></ProtectedRoute>} />
                  <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
                  <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
                  <Route path="/oauth/meta/callback" element={<MetaOAuthCallback />} />
                  <Route path="/oauth/youtube/callback" element={<YouTubeOAuthCallback />} />
                  <Route path="/oauth/tiktok/callback" element={<TikTokOAuthCallback />} />
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
