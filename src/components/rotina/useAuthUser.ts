import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  status: "loading" | "signedIn" | "signedOut";
  user: User | null;
  session: Session | null;
}

export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    session: null,
  });

  useEffect(() => {
    let alive = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setState({
        status: session?.user ? "signedIn" : "signedOut",
        user: session?.user ?? null,
        session,
      });
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setState({
        status: data.session?.user ? "signedIn" : "signedOut",
        user: data.session?.user ?? null,
        session: data.session,
      });
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}