import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/app/AppShell";

const Index = lazy(() => import("./pages/Index"));
const CommercialPage = lazy(() => import("./features/comercial/CommercialPage"));
const AtendimentosPage = lazy(() => import("./features/atendimentos/AtendimentosPage"));
const EscalaPage = lazy(() => import("./features/escala/EscalaPage"));
const CadastrosPage = lazy(() => import("./features/cadastros/CadastrosPage"));
const ResultadosPage = lazy(() => import("./features/resultados/ResultadosPage"));
const AutomacoesPage = lazy(() => import("./features/automacoes/AutomacoesPage"));
const MarketingPage = lazy(() => import("./features/marketing/MarketingPage"));
const PageLoading = () => <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Carregando tela…</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/comercial/leads" replace />} />
            <Route path="/comercial/leads/:leadId?" element={<Suspense fallback={<PageLoading />}><CommercialPage /></Suspense>} />
            <Route path="/atendimentos" element={<Suspense fallback={<PageLoading />}><AtendimentosPage /></Suspense>} />
            <Route path="/escala" element={<Suspense fallback={<PageLoading />}><EscalaPage /></Suspense>} />
            <Route path="/cadastros" element={<Navigate to="/cadastros/funcionarios" replace />} />
            <Route path="/cadastros/:directoryKind" element={<Suspense fallback={<PageLoading />}><CadastrosPage /></Suspense>} />
            <Route path="/resultados" element={<Navigate to="/resultados/visao-geral" replace />} />
            <Route path="/resultados/:section" element={<Suspense fallback={<PageLoading />}><ResultadosPage /></Suspense>} />
            <Route path="/automacoes" element={<Suspense fallback={<PageLoading />}><AutomacoesPage /></Suspense>} />
            <Route path="/marketing" element={<Suspense fallback={<PageLoading />}><MarketingPage /></Suspense>} />
            <Route path="/modulos" element={<Suspense fallback={<PageLoading />}><Index /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
