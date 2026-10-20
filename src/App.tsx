import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/app/AppShell";
import { ThemeProvider } from "./components/app/ThemeProvider";
import { getDocumentTitle } from "./components/app/page-titles";
import { DataState } from "@/components/data/DataState";

const CommercialPage = lazy(() => import("./features/comercial/CommercialPage"));
const AtendimentosPage = lazy(() => import("./features/atendimentos/AtendimentosPage"));
const EscalaPage = lazy(() => import("./features/escala/EscalaPage"));
const CadastrosPage = lazy(() => import("./features/cadastros/CadastrosPage"));
const ResultadosPage = lazy(() => import("./features/resultados/ResultadosPage"));
const AutomacoesPage = lazy(() => import("./features/automacoes/AutomacoesPage"));
const SettingsPage = lazy(() => import("./features/configuracoes/SettingsPage"));
const HojePage = lazy(() => import("./features/hoje/HojePage"));
const AuthPage = lazy(() => import("./pages/Auth"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const PageLoading = () => (
  <DataState
    variant="loading"
    title="Carregando tela"
    description="Aguarde enquanto o módulo abre."
    className="min-h-64 border-0 bg-transparent"
  />
);

const legacyTabDestinations: Record<string, string> = {
  Agenda: "/escala",
  Leads: "/comercial/leads",
  Perdas: "/comercial/leads?view=perdidos",
  Detalhado: "/atendimentos",
  Indicadores: "/resultados/visao-geral",
  Metas: "/resultados/metas",
  "Automações": "/automacoes",
  Cadastros: "/cadastros/funcionarios",
};

function LegacyModuleRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get("tab") || "";
  return <Navigate to={legacyTabDestinations[legacyTab] || "/comercial/leads"} replace />;
}

function RouteDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${getDocumentTitle(pathname)} | Gerencia DNZ`;
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();
const componentGalleryEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_COMPONENT_GALLERY === "true";
const ComponentGalleryPage = componentGalleryEnabled
  ? lazy(() => import("./features/configuracoes/ComponentGalleryPage"))
  : null;

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <Toaster />
          <BrowserRouter>
            <RouteDocumentTitle />
            <Routes>
              <Route path="/auth" element={<Suspense fallback={<PageLoading />}><AuthPage /></Suspense>} />
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/hoje" replace />} />
                <Route path="/hoje" element={<Suspense fallback={<PageLoading />}><HojePage /></Suspense>} />
                <Route path="/comercial/leads/:leadId?" element={<Suspense fallback={<PageLoading />}><CommercialPage /></Suspense>} />
                <Route path="/atendimentos" element={<Suspense fallback={<PageLoading />}><AtendimentosPage /></Suspense>} />
                <Route path="/escala" element={<Suspense fallback={<PageLoading />}><EscalaPage /></Suspense>} />
                <Route path="/cadastros" element={<Navigate to="/cadastros/funcionarios" replace />} />
                <Route path="/cadastros/:directoryKind" element={<Suspense fallback={<PageLoading />}><CadastrosPage /></Suspense>} />
                <Route path="/resultados" element={<Navigate to="/resultados/visao-geral" replace />} />
                <Route path="/resultados/:section" element={<Suspense fallback={<PageLoading />}><ResultadosPage /></Suspense>} />
                <Route path="/automacoes/:automationId?" element={<Suspense fallback={<PageLoading />}><AutomacoesPage /></Suspense>} />
                <Route path="/configuracoes" element={<Navigate to="/configuracoes/integracoes" replace />} />
                {ComponentGalleryPage && (
                  <>
                    <Route path="/ui" element={<Suspense fallback={<PageLoading />}><ComponentGalleryPage /></Suspense>} />
                    <Route path="/configuracoes/componentes" element={<Navigate to="/ui" replace />} />
                  </>
                )}
                <Route path="/configuracoes/:section" element={<Suspense fallback={<PageLoading />}><SettingsPage /></Suspense>} />
                <Route path="/modulos" element={<LegacyModuleRedirect />} />
              </Route>
              <Route path="*" element={<Suspense fallback={<PageLoading />}><NotFoundPage /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
