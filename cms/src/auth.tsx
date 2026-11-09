import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext } from './auth-context'

import { api, ApiError, loadSession, saveSession, setUnauthorizedHandler, type Session } from './api/client'
import type { Role, TokenResponse } from './api/types'

const CMS_ROLES: Role[] = ['EDITOR', 'PUBLISHER', 'ADMIN']


export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(() => loadSession())

  const logout = useCallback(() => {
    saveSession(null)
    setSession(null)
    qc.clear()
  }, [qc])

  useEffect(() => setUnauthorizedHandler(logout), [logout])

  const login = useCallback(async (email: string, password: string) => {
    const t = await api<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: { email, password }, auth: false })
    if (!CMS_ROLES.includes(t.user.role)) {
      throw new ApiError(403, 'no_cms_access', 'This account has no access to the CMS. Ask an admin for the Editor role.')
    }
    const s: Session = { token: t.accessToken, expiresAt: t.expiresAt, email: t.user.email, role: t.user.role, id: t.user.id }
    saveSession(s)
    setSession(s)
  }, [])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
