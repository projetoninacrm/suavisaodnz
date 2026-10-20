import { Fragment, useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigationType } from "react-router-dom";
import {
  CalendarDays, ChartNoAxesCombined, ClipboardList,
  ContactRound, LayoutDashboard, Settings2,
  Sun, UserRound, UsersRound, Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getBreadcrumbSegments } from "@/components/app/page-titles";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { AccountMenuProps } from "./AccountMenu";

type AppLink = { label: string; to: string; icon: LucideIcon; disabled?: boolean };

const operationalLinks: AppLink[] = [
  { label: "Hoje", to: "/hoje", icon: Sun },
  { label: "Comercial", to: "/comercial/leads", icon: UsersRound },
  { label: "Atendimentos", to: "/atendimentos", icon: ContactRound },
  { label: "Resultados", to: "/resultados", icon: ChartNoAxesCombined },
  { label: "Automações", to: "/automacoes", icon: Workflow },
];

const managementLinks: AppLink[] = [
  { label: "Cadastros", to: "/cadastros", icon: ClipboardList },
  { label: "Escala", to: "/escala", icon: CalendarDays },
  { label: "Configurações", to: "/configuracoes", icon: Settings2 },
];

function NavigationGroup({ title, items }: {
  title: string;
  items: AppLink[];
}) {
  const location = useLocation();

  return (
    <SidebarGroup className="gap-1 px-0 py-2">
      <SidebarGroupLabel className="h-auto px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
      {items.map(({ label, to, icon: Icon, disabled }) => {
        if (disabled) {
          return (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton type="button" disabled title="Disponível em uma próxima etapa" className="h-10 px-3">
                <Icon aria-hidden="true" />
                <span>{label}</span>
                <span className="ml-auto text-[10px]">Em breve</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }
        const isActive = matchPath({ path: to, end: to === "/hoje" }, location.pathname) !== null;

        return (
          <SidebarMenuItem key={label}>
            <SidebarMenuButton
              render={<NavLink to={to} end={to === "/hoje"} />}
              isActive={isActive}
              closeOnMobile
              className="h-10 px-3"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarContents() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader className="shrink-0 p-0">
        <SidebarMenuButton
          render={<Link to="/hoje" />}
          closeOnMobile
          className="flex h-16 items-center gap-3 rounded-none border-b border-sidebar-border px-4 py-0 hover:bg-transparent"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutDashboard className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">Gerencia DNZ</span>
            <span className="block text-xs text-muted-foreground">Operação da loja</span>
          </span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent className="gap-0 overflow-hidden p-0">
        <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto">
          <NavigationGroup title="Operação" items={operationalLinks} />
          <NavigationGroup title="Gestão" items={managementLinks} />
        </nav>
      </SidebarContent>
    </div>
  );
}

export function AppShell() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountMenuView, setAccountMenuView] = useState<ComponentType<AccountMenuProps> | null>(null);
  const [isAccountMenuMounted, setIsAccountMenuMounted] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAccountMenuLoading, setIsAccountMenuLoading] = useState(false);
  const accountMenuLoad = useRef<Promise<void> | null>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());
  const previousLocation = useRef<{ key: string; pathname: string } | null>(null);
  const breadcrumbSegments = getBreadcrumbSegments(location.pathname);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previousRestoration; };
  }, []);

  useEffect(() => {
    const previous = previousLocation.current;
    if (previous && !scrollPositions.current.has(previous.key)) {
      scrollPositions.current.set(previous.key, window.scrollY);
    }

    const sameOverlayRoute = previous && (
      (/^\/comercial\/leads(?:\/[^/]+)?$/.test(previous.pathname) && /^\/comercial\/leads(?:\/[^/]+)?$/.test(location.pathname)) ||
      (/^\/automacoes(?:\/[^/]+)?$/.test(previous.pathname) && /^\/automacoes(?:\/[^/]+)?$/.test(location.pathname))
    );

    let frame = 0;
    if (previous && navigationType === "POP") {
      frame = window.requestAnimationFrame(() => window.scrollTo(0, scrollPositions.current.get(location.key) ?? 0));
    } else if (previous && previous.pathname !== location.pathname && !sameOverlayRoute) {
      frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    } else {
      scrollPositions.current.set(location.key, window.scrollY);
    }

    previousLocation.current = { key: location.key, pathname: location.pathname };
    return () => { if (frame) window.cancelAnimationFrame(frame); };
  }, [location.key, location.pathname, navigationType]);

  useEffect(() => {
    const savePosition = () => {
      const key = previousLocation.current?.key;
      if (key) scrollPositions.current.set(key, window.scrollY);
    };
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => window.removeEventListener("scroll", savePosition);
  }, []);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAccountEmail(session?.user.email ?? null);
    });
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (active) setAccountEmail(data.session?.user.email ?? null);
      })
      .catch(() => {
        if (active) setAccountEmail(null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Could not sign out:", error);
        toast.error("Não foi possível sair da conta", { description: "Tente novamente. Se o problema continuar, atualize a página." });
        return;
      }
      toast.success("Sessão encerrada", { description: "Você saiu da Gerencia DNZ." });
    } catch (cause) {
      console.error("Could not sign out:", cause);
      toast.error("Não foi possível sair da conta", {
        description: "Tente novamente. Se o problema continuar, atualize a página.",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const loadAccountMenu = () => {
    if (accountMenuView || accountMenuLoad.current) return accountMenuLoad.current;

    setIsAccountMenuLoading(true);
    const load = import("./AccountMenu")
      .then(({ default: AccountMenu }) => {
        setAccountMenuView(() => AccountMenu);
      })
      .catch((cause: unknown) => {
        console.error("Could not load account menu:", cause);
        toast.error("Não foi possível carregar o menu da conta", {
          description: "Tente novamente. Se o problema continuar, atualize a página.",
        });
      })
      .finally(() => {
        accountMenuLoad.current = null;
        setIsAccountMenuLoading(false);
      });

    accountMenuLoad.current = load;
    return load;
  };

  const openAccountMenu = () => {
    setIsAccountMenuMounted(true);
    setIsAccountMenuOpen(true);
    void loadAccountMenu();
  };

  const AccountMenu = accountMenuView;

  return (
    <SidebarProvider
      className="min-h-svh bg-background text-foreground"
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Pular para o conteúdo
      </a>
      <Sidebar collapsible="offcanvas" mobileTitle="Menu principal">
        <SidebarContents />
      </Sidebar>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger aria-label="Alternar menu" className="size-10 shrink-0 md:hidden" />
          <div className="min-w-0 flex-1">
            {breadcrumbSegments.length > 0 && (
              <Breadcrumb aria-label="Caminho de navegação" className="min-w-0">
                <BreadcrumbList className="flex-nowrap gap-1 overflow-hidden text-xs sm:gap-1.5">
                  {breadcrumbSegments.map((segment, index) => (
                    <Fragment key={`${segment.label}-${index}`}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem className="min-w-0">
                        <BreadcrumbLink asChild className="block max-w-[42vw] truncate">
                          <Link to={segment.href ?? "/hoje"}>{segment.label}</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
          {AccountMenu && isAccountMenuMounted ? (
            <AccountMenu
              accountEmail={accountEmail}
              isSigningOut={isSigningOut}
              onLogout={handleLogout}
              open={isAccountMenuOpen}
              onOpenChange={setIsAccountMenuOpen}
            />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isAccountMenuLoading ? "Carregando menu da conta" : "Abrir menu da conta"}
              aria-busy={isAccountMenuLoading || undefined}
              title="Conta"
              disabled={isSigningOut}
              onPointerEnter={() => void loadAccountMenu()}
              onFocus={() => void loadAccountMenu()}
              onClick={openAccountMenu}
            >
              <UserRound className="size-4" aria-hidden="true" />
            </Button>
          )}
        </header>

        <main id="main-content" tabIndex={-1} className="min-h-[calc(100svh-4rem)] scroll-mt-16">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
