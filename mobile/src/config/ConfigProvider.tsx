import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { API_URL } from '../api/client';
import type { ConfigSnapshot } from '../api/types';
import { DEFAULT_CONFIG } from './defaultConfig';
import { isValidConfig } from './validateConfig';

const CACHE_KEY = 'skilltree.config.v1';
const MIN_REFRESH_MS = 60_000;

type Cached = { etag: string | null; snapshot: ConfigSnapshot };
type ConfigState = { snapshot: ConfigSnapshot; source: 'default' | 'cache' | 'network'; refresh: () => Promise<void> };

const ConfigContext = createContext<ConfigState | null>(null);

/**
 * Content release flow on the client:
 * 1. start with the last valid cached config (or bundled defaults),
 * 2. ask the API with If-None-Match → 304 when nothing changed,
 * 3. accept a new snapshot only if it passes validation, then cache it,
 * 4. check again whenever the app returns to the foreground.
 * On network errors the app keeps working with what it has.
 */
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ snapshot: ConfigSnapshot; source: ConfigState['source'] }>({
    snapshot: DEFAULT_CONFIG,
    source: 'default',
  });
  const etag = useRef<string | null>(null);
  const lastFetch = useRef(0);

  const refresh = useCallback(async () => {
    lastFetch.current = Date.now();
    try {
      const res = await fetch(`${API_URL}/api/v1/config`, {
        headers: etag.current ? { 'If-None-Match': etag.current } : {},
      });
      if (res.status === 304 || !res.ok) {
        return;
      }
      const body: unknown = await res.json();
      if (!isValidConfig(body)) {
        console.warn('[config] ignored invalid configuration from server');
        return;
      }
      etag.current = res.headers.get('ETag');
      setState({ snapshot: body, source: 'network' });
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ etag: etag.current, snapshot: body } satisfies Cached));
    } catch {
      // offline: keep the current configuration
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        const cached = raw ? (JSON.parse(raw) as Cached) : null;
        if (!cancelled && cached && isValidConfig(cached.snapshot)) {
          etag.current = cached.etag;
          setState({ snapshot: cached.snapshot, source: 'cache' });
        }
      } catch {
        // corrupted cache: fall back to defaults
      }
      if (!cancelled) {
        await refresh();
      }
    })();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && Date.now() - lastFetch.current > MIN_REFRESH_MS) {
        refresh();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refresh]);

  return <ConfigContext.Provider value={{ ...state, refresh }}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig must be used inside ConfigProvider');
  }
  return ctx;
}
