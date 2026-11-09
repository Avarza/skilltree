import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { request, setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { TokenResponse, User } from '../api/types';
import { clearActivity } from '../activity/activityLog';

const SESSION_KEY = 'skilltree.session';

type Session = { token: string; expiresAt: string; user: User };
type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** JWT lives in the iOS Keychain / Android Keystore via expo-secure-store, never in AsyncStorage. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback(async (s: Session | null) => {
    setAuthToken(s?.token ?? null);
    setSession(s);
    if (s) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    await apply(null);
    qc.clear();
    clearActivity();
  }, [apply, qc]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        const s = raw ? (JSON.parse(raw) as Session) : null;
        if (s && new Date(s.expiresAt).getTime() > Date.now() + 60_000) {
          await apply(s);
        } else if (s) {
          await apply(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [apply, logout]);

  const fromToken = (t: TokenResponse): Session => ({ token: t.accessToken, expiresAt: t.expiresAt, user: t.user });

  const login = useCallback(
    async (email: string, password: string) => {
      const t = await request<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: { email, password }, auth: false });
      await apply(fromToken(t));
    },
    [apply],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const t = await request<TokenResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: { email, password, displayName: displayName || undefined },
        auth: false,
      });
      await apply(fromToken(t));
    },
    [apply],
  );

  const value = useMemo<AuthState>(
    () => ({
      status: loading ? 'loading' : session ? 'signedIn' : 'signedOut',
      user: session?.user ?? null,
      login,
      register,
      logout,
    }),
    [loading, session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
