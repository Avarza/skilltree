// Mirrors backend DTOs (dev.skilltree.cms / release / audit / auth).

export type Role = 'USER' | 'EDITOR' | 'PUBLISHER' | 'ADMIN'
export type User = { id: number; email: string; displayName?: string | null; role: Role }
export type TokenResponse = { accessToken: string; expiresAt: string; user: User }

export type EntryType = 'SKILL_TEMPLATE' | 'THEME' | 'APP_CONFIG'
export type EntryStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED'

export type Entry<C = unknown> = {
  id: number
  type: EntryType
  slug: string
  status: EntryStatus
  content: C
  currentRevision: number
  publishedRevision: number | null
  updatedBy: number | null
  updatedAt: string
}

export type Revision<C = unknown> = { revision: number; content: C; note?: string | null; createdBy: number | null; createdAt: string }
export type PublishResponse<C = unknown> = { entry: Entry<C>; configVersion: number | null }

export type Palette = {
  primary: string
  onPrimary: string
  background: string
  surface: string
  textPrimary: string
  textSecondary: string
  nodeCompleted: string
  nodeInProgress: string
  nodeAvailable: string
  nodeLocked: string
}
export const PALETTE_KEYS: (keyof Palette)[] = [
  'primary', 'onPrimary', 'background', 'surface', 'textPrimary', 'textSecondary',
  'nodeCompleted', 'nodeInProgress', 'nodeAvailable', 'nodeLocked',
]
export type ThemeContent = {
  name: string
  light: Palette
  dark: Palette
  shape: { cardRadius: number; nodeBorderWidth: number; nodeShape: 'circle' | 'rounded' | 'hexagon' }
}

export type TemplateNode = { id: string; title: string; description?: string | null; xp: number; requires?: string[] | null }
export type TemplateContent = {
  title: string
  description?: string | null
  category: string
  icon?: string | null
  locale: string
  nodes: TemplateNode[]
}

export type AppConfigContent = {
  activeTheme: string
  aiGeneration: { enabled: boolean; dailyLimitPerUser: number; maxNodes: number }
  progression: { defaultNodeXp: number; xpPerLevel: number }
  defaultLocale: string
}

export type ConfigVersion = {
  version: number
  checksum: string
  source: 'PUBLISH' | 'ROLLBACK'
  note?: string | null
  createdBy: number | null
  createdAt: string
}

export type AuditLog = {
  id: number
  actorEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  details: string | null
  createdAt: string
}
export type Page<T> = { content: T[]; totalElements?: number; page?: { totalElements: number } }
