'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api, AUTH_TOKEN_COOKIE } from './api';

export interface Client {
  id:    string;
  email: string;
}

interface AuthContextValue {
  user:      Client | null;
  isLoading: boolean;
  login:     (email: string, password: string) => Promise<void>;
  signup:    (email: string, password: string) => Promise<void>;
  logout:    () => void;
}

interface AuthResponse {
  token:  string;
  client: Client;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user,      setUser]      = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate any stored token by calling /api/auth/me.
  // If the call fails (expired, invalid), wipe the cookie.
  useEffect(() => {
    const token = Cookies.get(AUTH_TOKEN_COOKIE);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get<Client>('/api/auth/me')
      .then(setUser)
      .catch(() => {
        Cookies.remove(AUTH_TOKEN_COOKIE);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persistAuth = useCallback((token: string, client: Client) => {
    Cookies.set(AUTH_TOKEN_COOKIE, token, {
      expires:  7,          // 7-day session
      sameSite: 'strict',
      secure:   process.env.NODE_ENV === 'production',
    });
    setUser(client);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, client } = await api.post<AuthResponse>('/api/auth/login', { email, password });
    persistAuth(token, client);
    router.push('/dashboard');
  }, [persistAuth, router]);

  const signup = useCallback(async (email: string, password: string) => {
    const { token, client } = await api.post<AuthResponse>('/api/auth/signup', { email, password });
    persistAuth(token, client);
    router.push('/dashboard');
  }, [persistAuth, router]);

  const logout = useCallback(() => {
    Cookies.remove(AUTH_TOKEN_COOKIE);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
