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
import Dashboard from "./pages/Dashboard";
import BrandSettings from "./pages/BrandSettings";
import Clientes from "./pages/Clientes";
import Contenido from "./pages/Contenido";

import Ventas from "./pages/Ventas";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import Invitacion from "./pages/Invitacion";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { MetaOAuthCallback } from "./pages/MetaOAuthCallback";
import { YouTubeOAuthCallback } from "./pages/YouTubeOAuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <BrandProvider>
              <Toaster />
              <Sonner />
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
                {/* Shared routes (with conditional content based on role) */}
                <Route path="/contenido" element={<ProtectedRoute><Contenido /></ProtectedRoute>} />
                <Route path="/content" element={<ProtectedRoute><Contenido /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
                <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
                <Route path="/oauth/meta/callback" element={<MetaOAuthCallback />} />
                <Route path="/oauth/youtube/callback" element={<YouTubeOAuthCallback />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrandProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
