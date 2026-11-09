import type { ConfigSnapshot } from '../api/types';

/**
 * Safe defaults bundled with the app. Used on first launch without network and whenever the
 * cached/downloaded configuration fails validation. Keep in sync with backend/src/main/resources/seed.
 */
export const DEFAULT_CONFIG: ConfigSnapshot = {
  schemaVersion: 1,
  version: 0,
  config: {
    activeTheme: 'default',
    aiGeneration: { enabled: true, dailyLimitPerUser: 5, maxNodes: 25 },
    progression: { defaultNodeXp: 100, xpPerLevel: 500 },
    defaultLocale: 'cs',
  },
  theme: {
    slug: 'default',
    name: 'SkillTree Default',
    light: {
      primary: '#0E7490', onPrimary: '#FFFFFF', background: '#F4F7F9', surface: '#FFFFFF', textPrimary: '#0F1A22',
      textSecondary: '#5B6B78', nodeCompleted: '#22B573', nodeInProgress: '#F5A524', nodeAvailable: '#0E7490', nodeLocked: '#C3CDD5',
    },
    dark: {
      primary: '#22D3EE', onPrimary: '#080C11', background: '#080C11', surface: '#10161D', textPrimary: '#EEF6F8',
      textSecondary: '#8C98A8', nodeCompleted: '#3BE3A4', nodeInProgress: '#FFC15C', nodeAvailable: '#22D3EE', nodeLocked: '#33404F',
    },
    shape: { cardRadius: 16, nodeBorderWidth: 2, nodeShape: 'circle' },
  },
  templates: [],
};
