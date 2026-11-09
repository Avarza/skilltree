import { useMemo } from 'react';

import type { NodeStatus } from '../api/types';
import { useConfig } from '../config/ConfigProvider';

/**
 * Design tokens. CMS-controlled values come from the published theme (theme.dark.*, theme.shape.*);
 * the rest are app constants that mirror the Figma "Theme" variables (border, surfaceMuted, danger, accent).
 */
export function useTheme() {
  const { snapshot } = useConfig();
  return useMemo(() => {
    const p = snapshot.theme.dark;
    const shape = snapshot.theme.shape;
    return {
      colors: {
        ...p,
        border: '#222C38',
        surfaceMuted: '#18202A',
        danger: '#FF7A8A',
        accent: '#34D399',
        white: '#FFFFFF',
      },
      gradient: ['#06B6D4', '#10B981'] as const,
      glow: '#22D3EE',
      radius: { sm: 8, md: 12, card: shape.cardRadius, full: 999 },
      space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
      nodeBorder: shape.nodeBorderWidth,
      nodeShape: shape.nodeShape,
      nodeColor(status: NodeStatus) {
        switch (status) {
          case 'COMPLETED':
            return p.nodeCompleted;
          case 'IN_PROGRESS':
            return p.nodeInProgress;
          case 'AVAILABLE':
            return p.nodeAvailable;
          default:
            return p.nodeLocked;
        }
      },
    };
  }, [snapshot]);
}

export type Theme = ReturnType<typeof useTheme>;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

/** Matches the Figma text styles. */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.66 },
} as const;

export type TypeVariant = keyof typeof type;
