import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthenticatedUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (active) setUserId(session?.user.id ?? null);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      if (error) {
        console.error("Error resolving authenticated user:", error);
        setUserId(null);
        return;
      }
      setUserId(data.session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return userId;
}
