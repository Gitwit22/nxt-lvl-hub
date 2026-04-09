import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  bootstrapAdminApi,
  type AuthTokenResponse,
  type MeResponse,
  getAccessToken,
  loginApi,
  logoutApi,
  meApi,
  refreshToken,
  registerApi,
  setAccessToken,
  setAuthErrorCallback,
} from "@/lib/api";

interface AuthContextType {
  isInitializing: boolean;
  isAuthenticated: boolean;
  me: MeResponse | null;
  authUserId: string | null;
  authEmail: string | null;
  isPlatformAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, setupToken?: string) => Promise<void>;
  bootstrapAdmin: (setupToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60 seconds before expiry (expiresIn is in seconds)
    const delay = Math.max((expiresIn - 60) * 1000, 0);
    refreshTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await refreshToken();
        if (result) {
          setAccessToken(result.accessToken);
          scheduleRefresh(result.expiresIn);
        } else {
          setIsAuthenticated(false);
          setMe(null);
          setAccessToken(null);
        }
      })();
    }, delay);
  }, []);

  const handleAuthSuccess = useCallback(
    async (tokens: AuthTokenResponse) => {
      console.log("[auth] handleAuthSuccess: storing token, expiresIn =", tokens.expiresIn);
      setAccessToken(tokens.accessToken);
      scheduleRefresh(tokens.expiresIn);
      try {
        console.log("[auth] handleAuthSuccess: calling meApi()");
        const profile = await meApi();
        console.log("[auth] handleAuthSuccess: meApi succeeded, setting profile");
        setMe(profile);
        setIsAuthenticated(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load profile after login";
        console.error("[auth] handleAuthSuccess: meApi failed:", msg);
        setAccessToken(null);
        throw new Error(`Login succeeded but profile load failed: ${msg}`);
      }
    },
    [scheduleRefresh],
  );

  // On mount: attempt to restore session via httpOnly refresh cookie
  useEffect(() => {
    void (async () => {
      console.log("[auth] mount: attempting to restore session via refresh cookie");
      const result = await refreshToken();
      if (result) {
        console.log("[auth] mount: refresh succeeded, loading profile");
        await handleAuthSuccess(result);
      } else {
        console.log("[auth] mount: no refresh cookie, starting unauthenticated");
      }
      setIsInitializing(false);
    })();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [handleAuthSuccess]);

  // Register a callback so apiRequest can signal a 401 that wasn't recoverable
  useEffect(() => {
    setAuthErrorCallback(() => {
      setIsAuthenticated(false);
      setMe(null);
      setAccessToken(null);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        console.log("[auth] login: calling loginApi");
        const tokens = await loginApi(email, password);
        console.log("[auth] login: loginApi returned, calling handleAuthSuccess");
        await handleAuthSuccess(tokens);
        console.log("[auth] login: success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        console.error("[auth] login: error:", msg);
        throw err;
      }
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (email: string, password: string, setupToken?: string) => {
      const tokens = await registerApi(email, password, setupToken);
      await handleAuthSuccess(tokens);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout errors; clear local state regardless
    } finally {
      setIsAuthenticated(false);
      setMe(null);
      setAccessToken(null);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const bootstrapAdmin = useCallback(
    async (setupToken: string) => {
      const tokens = await bootstrapAdminApi(setupToken);
      await handleAuthSuccess(tokens);
    },
    [handleAuthSuccess],
  );

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) return;
    const profile = await meApi();
    setMe(profile);
  }, []);

  const value: AuthContextType = {
    isInitializing,
    isAuthenticated,
    me,
    authUserId: me?.id ?? null,
    authEmail: me?.email ?? null,
    isPlatformAdmin: me?.isPlatformAdmin ?? false,
    login,
    register,
    bootstrapAdmin,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
