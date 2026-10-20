import { Fragment } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { useTheme, type ThemePreference } from "@/components/app/theme-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleHelp, EyeOff, Link2, MessageCircle, Moon, PlugZap, Sparkles, Sun } from "lucide-react";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { ButtonLink } from "@/components/app/ButtonLink";
import { Label } from "@/components/ui/label";

const sections = [
  { label: "Integrações", slug: "integracoes", title: "Integrações" },
  { label: "Preferências", slug: "preferencias", title: "Preferências" },
] as const;

const integrations = [
  {
    name: "Amigo",
    icon: PlugZap,
    scope: "Atendimentos e importação de dados",
    implementation: "Integrado no servidor",
    detail: "As consultas usam funções protegidas no Supabase. A interface não expõe credenciais nem confirma o estado atual do serviço.",
  },
  {
    name: "WhatsApp · UAZAPI",
    icon: MessageCircle,
    scope: "Envio das automações e recebimento de eventos",
    implementation: "Integrado no servidor",
    detail: "Envios e webhooks são tratados por Edge Functions. A conexão precisa ser verificada no painel de infraestrutura.",
  },
  {
    name: "OpenAI",
    icon: Sparkles,
    scope: "Análise e resumo de conversas e documentos",
    implementation: "Integrado no servidor",
    detail: "O webhook grava na Observação apenas os resumos retornados pela OpenAI; se a análise falhar, preserva as mensagens para nova tentativa. Nenhuma resposta automática é enviada ao cliente.",
  },
  {
    name: "Winners",
    icon: Link2,
    scope: "API de leitura para a plataforma externa",
    implementation: "Planejada",
    detail: "A API ainda precisa ser publicada e receber autenticação e escopos de leitura próprios.",
  },
] as const;

function IntegrationsSection() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4" role="note">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Esta tela mostra o estado da implementação no projeto. Ela ainda não consulta a saúde das conexões; credenciais permanecem nos secrets do servidor e nunca aparecem aqui.
        </p>
      </div>
      <ItemGroup role="list" aria-label="Integrações da plataforma" className="gap-2">
        {integrations.map((integration, index) => {
          const Icon = integration.icon;
          return (
            <Fragment key={integration.name}>
              <Item role="listitem" variant="outline" className="items-start">
                <ItemMedia variant="icon"><Icon aria-hidden="true" /></ItemMedia>
                <ItemContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <ItemTitle>{integration.name}</ItemTitle>
                    <Badge variant={integration.implementation === "Integrado no servidor" ? "secondary" : "outline"}>
                      {integration.implementation}
                    </Badge>
                  </div>
                  <ItemDescription>{integration.scope}. {integration.detail}</ItemDescription>
                </ItemContent>
              </Item>
              {index < integrations.length - 1 ? <ItemSeparator /> : null}
            </Fragment>
          );
        })}
      </ItemGroup>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Galeria de componentes</CardTitle>
          <p className="text-sm text-muted-foreground">Referência de manutenção do preset shadcn, com exemplos fictícios e andamento dos adapters.</p>
        </CardHeader>
        <CardContent>
          <ButtonLink to="/configuracoes/componentes" variant="outline">
            Abrir galeria
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: "system", label: "Usar preferência do dispositivo", icon: CircleHelp },
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
          <p className="text-sm text-muted-foreground">Escolha o tema usado neste navegador.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="theme-preference" className="text-sm font-medium">Tema</Label>
          <Select value={theme} onValueChange={(value) => {
            if (value === "system" || value === "light" || value === "dark") setTheme(value);
          }}>
            <SelectTrigger id="theme-preference" aria-label="Tema da plataforma" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="inline-flex items-center gap-2"><Icon className="size-4" aria-hidden="true" />{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">A mudança é aplicada imediatamente e fica salva neste navegador, sem alterar os dados compartilhados da loja.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const active = sections.find((item) => item.slug === section);
  if (!active) return <Navigate to="/configuracoes/integracoes" replace />;

  return (
    <section className="space-y-5">
      <PageHeader title={active.title} description="Gerencie integrações disponíveis e preferências pessoais da plataforma." />
      <Tabs value={active.slug} onValueChange={(value) => navigate(`/configuracoes/${value}`)}>
        <TabsList aria-label="Seções de configurações" className="h-auto max-w-full flex-wrap justify-start">
          {sections.map((item) => <TabsTrigger key={item.slug} value={item.slug}>{item.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="integracoes">
          {active.slug === "integracoes" && <IntegrationsSection />}
        </TabsContent>
        <TabsContent value="preferencias">
          {active.slug === "preferencias" && <PreferencesSection />}
        </TabsContent>
      </Tabs>
    </section>
  );
}
