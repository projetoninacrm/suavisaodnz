import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { Dialog } from "@base-ui/react/dialog";
import {
  CalendarDays, ChartNoAxesCombined, CircleHelp, ClipboardList,
  ContactRound, LayoutDashboard, LogOut, Menu, Megaphone, Settings2,
  UsersRound, Workflow, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseButton as Button } from "@/components/base/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type AppLink = { label: string; to: string; icon: LucideIcon; legacyTab?: string; activePrefix?: string; disabled?: boolean };

const operationalLinks: AppLink[] = [
  { label: "Comercial", to: "/comercial/leads", icon: UsersRound },
  { label: "Escala", to: "/escala", icon: CalendarDays, activePrefix: "/escala" },
  { label: "Atendimentos", to: "/atendimentos", icon: ContactRound, activePrefix: "/atendimentos" },
  { label: "Resultados", to: "/resultados/visao-geral", icon: ChartNoAxesCombined, activePrefix: "/resultados" },
  { label: "Automações", to: "/automacoes", icon: Workflow, activePrefix: "/automacoes" },
];

const managementLinks: AppLink[] = [
  { label: "Cadastros", to: "/cadastros/funcionarios", icon: ClipboardList, activePrefix: "/cadastros" },
  { label: "Marketing", to: "/marketing", icon: Megaphone, activePrefix: "/marketing" },
  { label: "Configurações", to: "/modulos?tab=Cadastros", icon: Settings2, disabled: true },
];

const legacyTitles: Record<string, string> = {
  Agenda: "Agenda", Detalhado: "Atendimentos", Indicadores: "Resultados", Metas: "Metas",
  Automações: "Automações", Cadastros: "Cadastros", Leads: "Leads", Perdas: "Perdas",
};

function NavigationGroup({ title, items, onNavigate, pathname, currentTab }: {
  title: string;
  items: AppLink[];
  onNavigate?: () => void;
  pathname: string;
  currentTab: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      {items.map(({ label, to, icon: Icon, legacyTab, activePrefix, disabled }) => {
        const active = activePrefix
          ? pathname.startsWith(activePrefix)
          : legacyTab
            ? pathname === "/modulos" && currentTab === legacyTab
            : false;
        if (disabled) {
          return (
            <div key={label} aria-disabled="true" title="Disponível em uma próxima etapa" className="flex h-10 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-muted-foreground/60">
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              <span className="ml-auto text-[10px]">Em breve</span>
            </div>
          );
        }
        return (
          <NavLink
            key={label}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        );
      })}
    </div>
  );
}

function SidebarContents({ onNavigate, pathname, currentTab }: {
  onNavigate?: () => void;
  pathname: string;
  currentTab: string | null;
}) {
  return (
    <div className="flex h-full flex-col px-3 pb-4">
      <Link to="/comercial/leads" onClick={onNavigate} className="flex h-16 items-center gap-3 border-b border-sidebar-border px-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <LayoutDashboard className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-sidebar-foreground">Gerencia DNZ</span>
          <span className="block text-xs text-muted-foreground">Operação da loja</span>
        </span>
      </Link>
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto">
        <NavigationGroup title="Operação" items={operationalLinks} onNavigate={onNavigate} pathname={pathname} currentTab={currentTab} />
        <NavigationGroup title="Gestão" items={managementLinks} onNavigate={onNavigate} pathname={pathname} currentTab={currentTab} />
      </nav>
      <div className="border-t border-sidebar-border pt-3">
        <Link to="/modulos?tab=Agenda" onClick={onNavigate} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <CircleHelp className="size-4" aria-hidden="true" /> Módulos atuais
        </Link>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/comercial/leads/")) return "Detalhe do lead";
    if (location.pathname.startsWith("/comercial/leads")) return "Comercial";
    if (location.pathname.startsWith("/atendimentos")) return "Atendimentos";
    if (location.pathname.startsWith("/escala")) return "Escala";
    if (location.pathname.startsWith("/cadastros")) return "Cadastros";
    if (location.pathname.startsWith("/resultados")) return "Resultados";
    if (location.pathname.startsWith("/automacoes")) return "Automações";
    if (location.pathname.startsWith("/marketing")) return "Marketing";
    if (location.pathname === "/modulos") return legacyTitles[currentTab || "Agenda"] || "Módulos atuais";
    return "Gerencia DNZ";
  }, [currentTab, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarContents pathname={location.pathname} currentTab={currentTab} />
      </aside>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:ml-60 md:px-6">
          <Dialog.Trigger className="inline-flex size-10 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:hidden" aria-label="Abrir menu">
            <Menu className="size-4" />
          </Dialog.Trigger>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Gerencia DNZ / Operação</p>
            <h1 className="truncate text-base font-semibold leading-5">{pageTitle}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair da conta" title="Sair">
            <LogOut className="size-4" />
          </Button>
        </header>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[open]:opacity-100 data-[closed]:opacity-0 md:hidden" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] bg-sidebar shadow-xl outline-none data-[open]:animate-in data-[open]:slide-in-from-left md:hidden">
            <Dialog.Title className="sr-only">Menu principal</Dialog.Title>
            <div className="absolute right-3 top-4 z-10">
              <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar menu"><X className="size-4" /></Dialog.Close>
            </div>
            <SidebarContents pathname={location.pathname} currentTab={currentTab} onNavigate={() => setMobileOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <main className="min-h-[calc(100svh-4rem)] md:ml-60">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
