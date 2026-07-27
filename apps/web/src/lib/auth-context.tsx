"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { clearAuthSession } from "./auth-utils";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "tf_token";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setToken(stored);
    fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => {
        if (r.ok) return r.json();
        // If /auth/me returns 401 or any error, clear stale session
        if (r.status === 401) {
          clearAuthSession();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setUser(data);
        } else {
          // Clear state if session restore failed
          setToken(null);
          setUser(null);
        }
      })
      .catch(() => {
        // Network error: clear state to avoid stale authenticated state
        clearAuthSession();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message ?? "Login failed");
    }
    const data = (await res.json()) as { user: AuthUser; token: string };
    localStorage.setItem(TOKEN_KEY, data.token);
    // NOTE: We intentionally do NOT write a client-readable `tf_token` cookie here.
    // The API sets an HttpOnly; Secure; SameSite=Lax cookie on login response,
    // which the Next.js Edge middleware reads for route protection. Writing a
    // duplicate readable cookie would weaken the XSS resistance of the model.
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
