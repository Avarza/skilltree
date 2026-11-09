import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import {
  House,
  Network,
  Sparkles,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme';

const ICONS: Record<string, LucideIcon> = {
  Home: House,
  SkillMap: Network,
  Generate: Sparkles,
  Progress: TrendingUp,
  Profile: User,
};
const BTN = 52;
const GAP = 8;
const PAD = 8;

/** Floating pill navigation: the gradient "planet" springs under the active icon. */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const target = useSharedValue(state.index);
  useEffect(() => {
    target.value = state.index; // plain write; spring runs on the UI thread
  }, [state.index, target]);
  const pos = useDerivedValue(() =>
    withSpring(target.value, { damping: 16, stiffness: 200, mass: 0.8 }),
  );
  const indicator = useAnimatedStyle(() => {
    const travel = Math.abs(pos.value - Math.round(pos.value));
    return {
      transform: [
        { translateX: pos.value * (BTN + GAP) },
        // squash slightly while moving, like a drop sliding between slots
        { scaleX: 1 + travel * 0.25 },
        { scaleY: 1 - travel * 0.15 },
      ],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 6 }]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: t.colors.surface, borderColor: t.colors.border },
        ]}
      >
        {state.routes.map(route => (
          <View
            key={`bg-${route.key}`}
            style={[
              styles.btn,
              {
                backgroundColor: t.colors.surfaceMuted,
                position: 'absolute',
                left: PAD + state.routes.indexOf(route) * (BTN + GAP),
                top: PAD,
              },
            ]}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { shadowColor: t.glow }, indicator]}
        >
          <LinearGradient
            colors={t.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name] ?? House;
          const label = descriptors[route.key].options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              style={styles.btn}
            >
              <TabIcon
                Icon={Icon}
                index={index}
                pos={pos}
                active="#04161C"
                inactive={t.colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Active and inactive icon cross-fade based on how close the indicator is. */
function TabIcon({
  Icon,
  index,
  pos,
  active,
  inactive,
}: {
  Icon: LucideIcon;
  index: number;
  pos: SharedValue<number>;
  active: string;
  inactive: string;
}) {
  const on = useAnimatedStyle(() => {
    const k = Math.max(0, 1 - Math.abs(pos.value - index));
    return {
      opacity: k,
      transform: [{ scale: interpolate(k, [0, 1], [0.85, 1.08]) }],
    };
  });
  const off = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(pos.value - index)),
  }));
  return (
    <View style={{ width: 22, height: 22 }}>
      <Animated.View style={[StyleSheet.absoluteFill, off]}>
        <Icon size={22} color={inactive} strokeWidth={2} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, on]}>
        <Icon size={22} color={active} strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    gap: GAP,
    padding: PAD,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    overflow: 'hidden',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
