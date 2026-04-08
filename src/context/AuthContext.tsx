import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
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
      setAccessToken(tokens.accessToken);
      scheduleRefresh(tokens.expiresIn);
      const profile = await meApi();
      setMe(profile);
      setIsAuthenticated(true);
    },
    [scheduleRefresh],
  );

  // On mount: attempt to restore session via httpOnly refresh cookie
  useEffect(() => {
    void (async () => {
      const result = await refreshToken();
      if (result) {
        await handleAuthSuccess(result);
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
      const tokens = await loginApi(email, password);
      await handleAuthSuccess(tokens);
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
