export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8090'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: string[]
  constructor(status: number, code: string, message: string, errors: string[] = []) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

const TOKEN_KEY = 'skilltree.cms.session'

export type Session = { token: string; expiresAt: string; email: string; role: string; id: number }

/**
 * The admin token lives in sessionStorage (cleared when the tab closes) rather than localStorage,
 * to limit how long a stolen token stays usable on a shared machine.
 */
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    const s = raw ? (JSON.parse(raw) as Session) : null
    return s && new Date(s.expiresAt).getTime() > Date.now() ? s : null
  } catch {
    return null
  }
}

export function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable (private mode): session lasts for the page lifetime only
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const session = loadSession()
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(init.auth !== false && session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 401 && init.auth !== false) {
    onUnauthorized?.()
  }
  if (!res.ok) {
    let p: { code?: string; detail?: string; errors?: string[] } = {}
    try {
      p = await res.json()
    } catch {
      // non-JSON body
    }
    throw new ApiError(res.status, p.code ?? 'http_error', p.detail ?? `Request failed (${res.status})`, p.errors ?? [])
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    return e.errors.length ? `${e.message}: ${e.errors.join('; ')}` : e.message
  }
  if (e instanceof TypeError) return 'Cannot reach the API server.'
  return 'Something went wrong.'
}
