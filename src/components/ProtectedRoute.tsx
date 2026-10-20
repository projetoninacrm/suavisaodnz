import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { DataState } from "@/components/data/DataState";

type AuthAccessState =
  | { status: "checking" }
  | { status: "error" }
  | { status: "ready"; session: Session | null };

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthAccessState>({ status: "checking" });
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    setAuthState({ status: "checking" });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (active) setAuthState({ status: "ready", session });
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        setAuthState(error ? { status: "error" } : { status: "ready", session: data.session });
      })
      .catch(() => {
        if (active && !receivedAuthEvent) setAuthState({ status: "error" });
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [retryVersion]);

  if (authState.status === "checking") {
    return (
      <DataState
        variant="loading"
        title="Verificando sessão"
        description="Aguarde enquanto confirmamos seu acesso."
        className="min-h-screen border-0 bg-transparent"
      />
    );
  }
  if (authState.status === "error") {
    return (
      <DataState
        variant="error"
        title="Acesso indisponível"
        description="Não foi possível verificar sua sessão. Confira a conexão e tente novamente."
        action={{
          label: "Tentar novamente",
          onClick: () => {
            setAuthState({ status: "checking" });
            setRetryVersion((version) => version + 1);
          },
        }}
        className="min-h-screen border-0 bg-transparent"
      />
    );
  }
  if (!authState.session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};
