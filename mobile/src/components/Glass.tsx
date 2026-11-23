import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/theme';

/** iOS 26+: native Liquid Glass. Checked once – it can't change while the app runs. */
export const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Glass reacts to touches (iOS 26 shimmer/scale). Use for buttons and bars. */
  interactive?: boolean;
  /** Optional colour wash, e.g. the brand cyan at low alpha. */
  tint?: string;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};

/**
 * Translucent "glass" background for floating controls.
 * - iOS 26+: real Liquid Glass (GlassView) – refracts the space background, specular edges, touch response.
 * - Older iOS: system material blur with a hairline highlight.
 * - Android: no cheap live blur, so a semi-opaque surface with the same highlight edge.
 * Pass the shape (borderRadius, size) in `style`; children render on top.
 */
export function GlassSurface({
  style,
  children,
  interactive,
  tint,
  pointerEvents,
}: Props) {
  const t = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const radius = flat.borderRadius;

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={tint}
        isInteractive={interactive}
        pointerEvents={pointerEvents}
        style={[{ overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  const edge = (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.18)',
        },
      ]}
    />
  );

  if (Platform.OS === 'ios') {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[{ overflow: 'hidden' }, style]}
      >
        <BlurView
          tint="systemChromeMaterialDark"
          intensity={60}
          style={StyleSheet.absoluteFill}
        />
        {tint ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        ) : null}
        {edge}
        {children}
      </View>
    );
  }

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        { overflow: 'hidden', backgroundColor: `${t.colors.surface}E0` },
        style,
      ]}
    >
      {tint ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      ) : null}
      {edge}
      {children}
    </View>
  );
}
