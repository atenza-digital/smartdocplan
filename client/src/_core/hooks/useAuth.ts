import { useEffect } from "react";
import { getLoginUrl } from "@/const";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};
  const auth = useLocalAuth();

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (auth.loading) return;
    if (auth.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [auth.loading, auth.user, redirectOnUnauthenticated, redirectPath]);

  return auth;
}
