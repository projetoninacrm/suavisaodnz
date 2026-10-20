import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LayoutDashboard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type AuthOperation = "login" | "recovery" | "update";
const DEFAULT_AUTHENTICATED_ROUTE = "/hoje";

function isNetworkFailure(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return error instanceof TypeError || (error instanceof Error && /network|fetch|timeout/i.test(error.message));
}

function getAuthErrorMessage(error: unknown, operation: AuthOperation) {
  if (isNetworkFailure(error)) {
    return "Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (operation === "login") {
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "Email ou senha incorretos. Confira os dados e tente novamente.";
    }
    if (message.includes("email not confirmed")) {
      return "Este email ainda não foi confirmado. Peça ajuda à pessoa responsável pelo sistema.";
    }
  }

  if (operation === "recovery" && /redirect_to|redirect url|not allowed/.test(message)) {
    return "A recuperação ainda não está habilitada para este endereço. Peça ajuda à pessoa responsável pelo sistema.";
  }

  if (operation === "update") {
    return "Não foi possível salvar a nova senha. Confira os requisitos e tente novamente.";
  }

  return operation === "recovery"
    ? "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde."
    : "Não foi possível entrar agora. Tente novamente.";
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const recoveryMode = searchParams.get("mode") === "update-password";
  const [view, setView] = useState<"login" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [recoverySessionAvailable, setRecoverySessionAvailable] = useState(false);
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recoveryEmailRef = useRef<HTMLInputElement>(null);
  const recoveryReturnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSessionChecked(true);
        setRecoverySessionAvailable(Boolean(data.session));
        if (error) {
          setErrorMessage("Não foi possível verificar sua sessão. Você ainda pode tentar entrar novamente.");
          return;
        }
        if (data.session && !recoveryMode) navigate(DEFAULT_AUTHENTICATED_ROUTE, { replace: true });
      })
      .catch(() => {
        if (!active) return;
        setSessionChecked(true);
        setRecoverySessionAvailable(false);
        setErrorMessage("Não foi possível verificar sua sessão. Você ainda pode tentar entrar novamente.");
      });

    return () => {
      active = false;
    };
  }, [navigate, recoveryMode]);

  useEffect(() => {
    if (view !== "recovery" || recoveryMode) return;
    if (recoveryEmailSent) recoveryReturnRef.current?.focus();
    else recoveryEmailRef.current?.focus();
  }, [recoveryEmailSent, recoveryMode, view]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrorMessage(getAuthErrorMessage(error, "login"));
        return;
      }
      navigate(DEFAULT_AUTHENTICATED_ROUTE, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    setRecoveryEmailSent(false);
    try {
      const redirectTo = new URL("/auth?mode=update-password", window.location.origin).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        setErrorMessage(getAuthErrorMessage(error, "recovery"));
        return;
      }
      setRecoveryEmailSent(true);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "recovery"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas não coincidem. Confira os dois campos.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(getAuthErrorMessage(error, "update"));
        return;
      }
      toast.success("Senha atualizada", { description: "Seu acesso foi recuperado." });
      navigate(DEFAULT_AUTHENTICATED_ROUTE, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "update"));
    } finally {
      setLoading(false);
    }
  };

  const returnToLogin = () => {
    setErrorMessage(null);
    setRecoveryEmailSent(false);
    setPassword("");
    setPasswordConfirmation("");
    setView("login");
    if (recoveryMode) setSearchParams({}, { replace: true });
  };

  const requestNewRecoveryLink = () => {
    setErrorMessage(null);
    setRecoveryEmailSent(false);
    setPassword("");
    setPasswordConfirmation("");
    setView("recovery");
    setSearchParams({}, { replace: true });
  };

  const title = recoveryMode ? "Criar nova senha" : view === "recovery" ? "Recuperar acesso" : "Acesso restrito";
  const description = recoveryMode
    ? "Defina uma nova senha para voltar ao painel."
    : view === "recovery"
      ? "Informe seu email para receber as instruções de recuperação."
      : "Entre com sua conta de funcionário para acessar o painel.";

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Gerencia DNZ</span>
              <span className="block text-xs text-muted-foreground">Área interna da loja</span>
            </span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível continuar</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {recoveryMode ? (
            sessionChecked ? (
              !recoverySessionAvailable ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">O link pode ter expirado ou já ter sido usado. Solicite outro para continuar.</p>
                  <Button type="button" className="w-full" onClick={requestNewRecoveryLink}>
                    Solicitar novo link
                  </Button>
                  <Button ref={recoveryReturnRef} type="button" variant="link" className="w-full" onClick={returnToLogin}>
                    <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao acesso
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => { setPassword(event.target.value); setErrorMessage(null); }}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(event) => { setPasswordConfirmation(event.target.value); setErrorMessage(null); }}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    {showPassword ? "Ocultar senhas" : "Mostrar senhas"}
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {loading ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </form>
              )
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Verificando link de recuperação...
              </div>
            )
          ) : view === "recovery" ? (
            recoveryEmailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  Se este email estiver cadastrado, você receberá instruções para recuperar o acesso.
                </p>
                <Button ref={recoveryReturnRef} type="button" variant="outline" className="w-full" onClick={returnToLogin}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao acesso
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRecoveryRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    ref={recoveryEmailRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setErrorMessage(null); }}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={returnToLogin}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao acesso
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setErrorMessage(null); }}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setErrorMessage(null); }}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => { setErrorMessage(null); setView("recovery"); }}>
                  Esqueci minha senha
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
