import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { request, setAuthToken, setLocalHandler, setUnauthorizedHandler } from '../api/client';
import type { TokenResponse, User } from '../api/types';
import { clearActivity, seedActivity } from '../activity/activityLog';
import { demoRequest, resetDemo } from '../demo/demoApi';
import { seedCompletions } from '../demo/demoData';

const SESSION_KEY = 'skilltree.session';

/** `demo` sessions never talk to the server: requests are answered by the local demo store. */
type Session = { token: string; expiresAt: string; user: User; demo?: boolean };
type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  startDemo: () => Promise<void>;
  logout: () => Promise<void>;
};

const DEMO_USER: User = { id: 0, email: 'demo@skilltree.app', displayName: 'Demo explorer', role: 'USER' };

const AuthContext = createContext<AuthState | null>(null);

/** JWT lives in the iOS Keychain / Android Keystore via expo-secure-store, never in AsyncStorage. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback(async (s: Session | null) => {
    setLocalHandler(s?.demo ? demoRequest : null);
    setAuthToken(s?.demo ? null : s?.token ?? null);
    setSession(s);
    if (s) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  }, []);

  // Read through a ref so `logout` stays stable (the startup effect below depends on it).
  const isDemoRef = useRef(false);
  isDemoRef.current = !!session?.demo;

  const logout = useCallback(async () => {
    const wasDemo = isDemoRef.current;
    await apply(null);
    qc.clear();
    clearActivity();
    if (wasDemo) {
      await resetDemo();
    }
  }, [apply, qc]);

  const startDemo = useCallback(async () => {
    qc.clear();
    await resetDemo();
    seedActivity(seedCompletions());
    const farFuture = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    await apply({ token: 'demo', expiresAt: farFuture, user: DEMO_USER, demo: true });
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
      isDemo: !!session?.demo,
      login,
      register,
      startDemo,
      logout,
    }),
    [loading, session, login, register, startDemo, logout],
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
