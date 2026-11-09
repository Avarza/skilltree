import { Platform } from 'react-native';

/**
 * Backend base URL. Dev: the iOS simulator reaches the Mac at localhost, the Android emulator at 10.0.2.2.
 * Release builds should point at the production API (set via a build-time constant / env when CI is wired up).
 */
export const API_URL = __DEV__
  ? Platform.select({ android: 'http://10.0.2.2:8090', default: 'http://localhost:8090' })
  : 'https://api.skilltree.dev';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type RequestOptions = { method?: string; body?: unknown; headers?: Record<string, string>; auth?: boolean };

export async function request<T>(path: string, { method = 'GET', body, headers = {}, auth = true }: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth && authToken) {
    onUnauthorized?.();
  }
  if (!res.ok) {
    // Backend errors are RFC 9457 problem details with { code, detail, errors? }.
    let problem: { code?: string; detail?: string; errors?: string[] } = {};
    try {
      problem = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, problem.code ?? 'http_error', problem.detail ?? `Request failed (${res.status})`, problem.errors ?? []);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    return e.message;
  }
  if (e instanceof TypeError) {
    return 'Cannot reach the server. Check your connection.';
  }
  return 'Something went wrong.';
}
