const resultTitles: Record<string, string> = {
  "visao-geral": "Visão geral",
  acompanhamento: "Acompanhamento",
  metas: "Metas",
  planejamento: "Planejamento",
};

const directoryTitles: Record<string, string> = {
  funcionarios: "Funcionários",
  profissionais: "Profissionais",
  categorias: "Categorias",
};

const settingsTitles: Record<string, string> = {
  integracoes: "Integrações",
  preferencias: "Preferências",
  componentes: "Galeria de componentes",
};

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function getDocumentTitle(pathname: string) {
  const path = normalizePath(pathname);

  if (path === "/") return "Hoje";
  if (path === "/auth") return "Acesso restrito";
  if (path === "/hoje") return "Hoje";
  if (path === "/comercial/leads") return "Comercial";
  if (path.startsWith("/comercial/leads/")) return "Detalhe do lead";
  if (path === "/atendimentos") return "Atendimentos";
  if (path === "/escala") return "Escala";
  if (path === "/cadastros") return "Cadastros";
  if (path.startsWith("/cadastros/")) {
    const directory = path.slice("/cadastros/".length);
    return directoryTitles[directory] ?? "Cadastros";
  }
  if (path === "/resultados") return "Resultados";
  if (path.startsWith("/resultados/")) {
    const section = path.slice("/resultados/".length);
    return resultTitles[section] ?? "Resultados";
  }
  if (path === "/automacoes") return "Automações";
  if (path.startsWith("/automacoes/")) return "Detalhe da automação";
  if (path === "/configuracoes") return "Configurações";
  if (path === "/ui") return "Galeria de componentes";
  if (path.startsWith("/configuracoes/")) {
    const section = path.slice("/configuracoes/".length);
    return settingsTitles[section] ?? "Configurações";
  }
  if (path === "/modulos") return "Gerencia DNZ";

  return "Página não encontrada";
}

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export function getBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const path = normalizePath(pathname);
  const segments: BreadcrumbSegment[] = path === "/hoje" ? [] : [{ label: "Início", href: "/hoje" }];
  let parent: BreadcrumbSegment | undefined;

  if (path.startsWith("/comercial/leads/")) {
    parent = { label: "Comercial", href: "/comercial/leads" };
  } else if (path.startsWith("/cadastros/")) {
    parent = { label: "Cadastros", href: "/cadastros/funcionarios" };
  } else if (path.startsWith("/resultados/")) {
    parent = { label: "Resultados", href: "/resultados/visao-geral" };
  } else if (path.startsWith("/automacoes/")) {
    parent = { label: "Automações", href: "/automacoes" };
  } else if (path.startsWith("/configuracoes/")) {
    parent = { label: "Configurações", href: "/configuracoes/integracoes" };
  }

  if (parent) segments.push(parent);
  return segments;
}

