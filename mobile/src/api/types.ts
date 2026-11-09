// Mirrors the backend contract (backend/src/main/java/dev/skilltree/**).

export type Palette = {
  primary: string;
  onPrimary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  nodeCompleted: string;
  nodeInProgress: string;
  nodeAvailable: string;
  nodeLocked: string;
};

export type ThemeContent = {
  slug: string;
  name: string;
  light: Palette;
  dark: Palette;
  shape: { cardRadius: number; nodeBorderWidth: number; nodeShape: 'circle' | 'rounded' | 'hexagon' };
};

export type TemplateNode = { id: string; title: string; description?: string | null; xp: number; requires?: string[] | null };

export type TemplateContent = {
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  icon?: string | null;
  locale: string;
  nodes: TemplateNode[];
};

export type AppConfig = {
  activeTheme: string;
  aiGeneration: { enabled: boolean; dailyLimitPerUser: number; maxNodes: number };
  progression: { defaultNodeXp: number; xpPerLevel: number };
  defaultLocale: string;
};

/** GET /api/v1/config — the published content release. */
export type ConfigSnapshot = {
  schemaVersion: number;
  version: number;
  publishedAt?: string;
  checksum?: string;
  config: AppConfig;
  theme: ThemeContent;
  templates: TemplateContent[];
};

export type Role = 'USER' | 'EDITOR' | 'PUBLISHER' | 'ADMIN';
export type User = { id: number; email: string; displayName?: string | null; role: Role };
export type TokenResponse = { accessToken: string; expiresAt: string; user: User };

export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
export type TreeNode = { id: string; title: string; description?: string | null; xp: number; requires: string[]; status: NodeStatus };

export type SkillTree = {
  id: string;
  title: string;
  description?: string | null;
  source: 'MANUAL' | 'TEMPLATE' | 'AI';
  templateSlug?: string | null;
  nodes: TreeNode[];
  earnedXp: number;
  totalXp: number;
  level: number;
  completedNodes: number;
  createdAt: string;
  updatedAt: string;
};

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type GenerateRequest = { topic: string; level: Level; goal?: string; locale?: string };
