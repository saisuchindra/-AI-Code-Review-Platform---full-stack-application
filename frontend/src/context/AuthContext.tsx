import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi, extractError, type AuthPayload } from "../api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name?: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("refreshToken"));
  const [loading, setLoading] = useState(true);

  const persist = useCallback((data: AuthPayload) => {
    setUser(data.user);
    setToken(data.tokens.accessToken);
    setRefreshToken(data.tokens.refreshToken);
    localStorage.setItem("token", data.tokens.accessToken);
    localStorage.setItem("refreshToken", data.tokens.refreshToken);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }, []);

  // Bootstrap — try loading profile from stored token
  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await authApi.profile(token);
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        // try refresh
        if (refreshToken) {
          const r = await authApi.refresh(refreshToken);
          if (r.success && r.data) {
            setToken(r.data.accessToken);
            setRefreshToken(r.data.refreshToken);
            localStorage.setItem("token", r.data.accessToken);
            localStorage.setItem("refreshToken", r.data.refreshToken);
            const p = await authApi.profile(r.data.accessToken);
            if (p.success && p.data) { setUser(p.data); }
            else { clear(); }
          } else { clear(); }
        } else { clear(); }
      }
      setLoading(false);
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) { persist(res.data); return null; }
    return extractError(res);
  };

  const register = async (email: string, password: string, name?: string): Promise<string | null> => {
    const res = await authApi.register({ email, password, name });
    if (res.success && res.data) { persist(res.data); return null; }
    return extractError(res);
  };

  const logout = () => {
    if (token) authApi.logout(token).catch(() => {});
    clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
