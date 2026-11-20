import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api";
import { onUnauthorized } from "../api/client";
import type { User } from "../types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: Parameters<typeof authApi.register>[0]) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    setStatus(u ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    // Restore the session (the session cookie is HttpOnly, so ask the server).
    // Any failure (401, network error) leaves the visitor signed out; protected
    // pages then redirect to the login screen.
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null));
    // If any later request reports an expired session, drop to signed-out state.
    onUnauthorized(() => setUser(null));
    return () => onUnauthorized(null);
  }, [setUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const u = await authApi.login(identifier, password);
      setUser(u);
      return u;
    },
    [setUser],
  );

  const register = useCallback(
    async (data: Parameters<typeof authApi.register>[0]) => {
      const u = await authApi.register(data);
      setUser(u);
      return u;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, [setUser]);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser: (u: User) => setUser(u) }),
    [user, status, login, register, logout, setUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function displayNameOf(user: User | null): string {
  if (!user) return "";
  return user.display_name?.trim() || user.username;
}
