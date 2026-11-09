import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import React, { useEffect } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { type as typeScale, useTheme, type TypeVariant } from '../theme/theme';

// ---------------------------------------------------------------------------------------------------------------
// Text

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}: {
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        { color: color ?? t.colors.textPrimary },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Layout

/** Full-screen dark background with the soft cyan/emerald glows from the design. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  bottomInset = 120,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
}) {
  const t = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="g1" cx="10%" cy="5%" r="60%">
            <Stop offset="0" stopColor={t.gradient[0]} stopOpacity="0.35" />
            <Stop offset="1" stopColor={t.gradient[0]} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="g2" cx="90%" cy="55%" r="50%">
            <Stop offset="0" stopColor={t.gradient[1]} stopOpacity="0.14" />
            <Stop offset="1" stopColor={t.gradient[1]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g1)" />
        <Rect width="100%" height="100%" fill="url(#g2)" />
      </Svg>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {content}
      </SafeAreaView>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.card,
          padding: 16,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = 8,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Controls

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'large' | 'small';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon: Icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const t = useTheme();
  const height = size === 'large' ? 56 : 40;
  const fg = variant === 'primary' ? '#04161C' : t.colors.primary;
  const inner = (
    <View
      style={[
        styles.btnInner,
        { height, paddingHorizontal: size === 'large' ? 24 : 16 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={fg} strokeWidth={2.2} /> : null}
          <AppText variant="bodyStrong" color={fg}>
            {label}
          </AppText>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: disabled ? 0.45 : pressed ? 0.85 : 1, borderRadius: 999 },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={t.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.pill,
            {
              shadowColor: t.glow,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
            },
          ]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.pill,
            variant === 'secondary' && {
              backgroundColor: t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
            },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  label,
  size = 36,
  filled,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  size?: number;
  filled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? t.colors.surface : t.colors.surfaceMuted,
        borderWidth: filled ? 1 : 0,
        borderColor: t.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon
        size={size / 2}
        color={filled ? t.colors.textPrimary : t.colors.primary}
        strokeWidth={2}
      />
    </Pressable>
  );
}

export function Chip({
  icon: Icon,
  label,
  color,
}: {
  icon?: LucideIcon;
  label: string;
  color?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border },
      ]}
    >
      {Icon ? (
        <Icon size={16} color={color ?? t.colors.accent} strokeWidth={2} />
      ) : null}
      <AppText variant="bodyStrong">{label}</AppText>
    </View>
  );
}

export function ProgressBar({
  value,
  height = 10,
}: {
  value: number;
  height?: number;
}) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: t.colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      {pct > 0 ? (
        <LinearGradient
          colors={
            pct >= 1
              ? [t.colors.nodeCompleted, t.colors.nodeCompleted]
              : t.gradient
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            borderRadius: height / 2,
          }}
        />
      ) : null}
    </View>
  );
}

export function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: hexAlpha(color, 0.14) }]}>
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }}
      />
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}

export function TextField({
  label,
  helper,
  error,
  ...input
}: { label: string; helper?: string; error?: string | null } & TextInputProps) {
  const t = useTheme();
  const [focused, setFocused] = React.useState(false);
  const border = error
    ? t.colors.danger
    : focused
    ? t.colors.primary
    : t.colors.border;
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      <AppText variant="caption" color={t.colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={t.colors.textSecondary}
        selectionColor={t.colors.primary}
        {...input}
        onFocus={e => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          typeScale.body,
          {
            color: t.colors.textPrimary,
            backgroundColor: t.colors.surface,
            borderColor: border,
            borderWidth: focused || error ? 2 : 1,
            borderRadius: 12,
            paddingHorizontal: 16,
            minHeight: 52,
            paddingVertical: 12,
          },
        ]}
      />
      {error || helper ? (
        <AppText
          variant="caption"
          color={error ? t.colors.danger : t.colors.textSecondary}
        >
          {error ?? helper}
        </AppText>
      ) : null}
    </View>
  );
}

/** Segmented control with a gradient indicator that springs to the selected option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  const index = Math.max(
    0,
    options.findIndex(o => o.value === value),
  );
  const target = useSharedValue(index);
  const width = useSharedValue(0);
  useEffect(() => {
    target.value = index; // plain write; the spring runs on the UI thread below
  }, [index, target]);
  // Spring started inside a UI-thread derivation (JS-started animations don't reliably reach the UI here).
  const pos = useDerivedValue(() =>
    withSpring(target.value, { damping: 18, stiffness: 220, mass: 0.7 }),
  );
  const itemW = useDerivedValue(
    () => (width.value - 8 - 4 * (options.length - 1)) / options.length,
  );
  const indicator = useAnimatedStyle(() => ({
    width: itemW.value,
    transform: [{ translateX: pos.value * (itemW.value + 4) }],
    opacity: width.value > 0 ? 1 : 0,
  }));
  return (
    <View
      style={[styles.segment, { backgroundColor: t.colors.surfaceMuted }]}
      accessibilityRole="radiogroup"
      onLayout={e => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 4,
            top: 4,
            bottom: 4,
            borderRadius: 999,
            overflow: 'hidden',
          },
          indicator,
        ]}
      >
        <LinearGradient
          colors={t.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {options.map((o, i) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={{ flex: 1 }}
          accessibilityRole="radio"
          accessibilityState={{ selected: i === index }}
        >
          <View style={styles.segmentItem}>
            <SegmentLabel
              label={o.label}
              i={i}
              pos={pos}
              active="#04161C"
              inactive={t.colors.textSecondary}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function SegmentLabel({
  label,
  i,
  pos,
  active,
  inactive,
}: {
  label: string;
  i: number;
  pos: SharedValue<number>;
  active: string;
  inactive: string;
}) {
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(1, Math.abs(pos.value - i)),
      [0, 1],
      [active, inactive],
    ),
  }));
  return (
    <Animated.Text style={[typeScale.bodyStrong, style]}>{label}</Animated.Text>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <AppText variant="headline">{title}</AppText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText variant="bodyStrong" color={t.colors.primary}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.background,
      }}
    >
      <ActivityIndicator color={t.colors.primary} />
    </View>
  );
}

export function hexAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, gap: 14 },
  pill: { borderRadius: 999 },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4 },
  segmentItem: { borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
});
