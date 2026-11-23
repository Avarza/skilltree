import { createContext, useContext } from 'react'

import type { Session } from './api/client'

export type AuthState = {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** Role hierarchy mirrors the backend: ADMIN > PUBLISHER > EDITOR. */
export function canPublish(role?: string) {
  return role === 'PUBLISHER' || role === 'ADMIN'
}
export function isAdmin(role?: string) {
  return role === 'ADMIN'
}
