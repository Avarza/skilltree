import { Focus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { scheduleOnUI } from 'react-native-worklets';

import { AppText } from '../components/ui';
import { useTheme } from '../theme/theme';

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const SPRING = { damping: 22, stiffness: 140, mass: 0.9 };

type Point = { x: number; y: number };

/**
 * A pannable / zoomable "outer space" viewport. Children are laid out in content coordinates
 * (contentWidth × contentHeight); the camera (translate + scale) runs on the UI thread.
 * Three star layers move with parallax for depth and wrap around, so space feels endless.
 */
export function SpaceCanvas({
  contentWidth,
  contentHeight,
  focus,
  focusAnchorY = 0.38,
  controlsTop = 8,
  children,
}: {
  /** Vertical offset of the fit button / hint, e.g. to clear a floating header. */
  controlsTop?: number;
  contentWidth: number;
  contentHeight: number;
  /** Content point the camera glides to (e.g. the selected node). */
  focus: Point | null;
  /** Where on screen (0–1 of height) the focus point is placed; leaves room for the bottom sheet. */
  focusAnchorY?: number;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const [view, setView] = useState({ w: 0, h: 0 });
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const vw = useSharedValue(0);
  const vh = useSharedValue(0);
  const cw = useSharedValue(contentWidth);
  const ch = useSharedValue(contentHeight);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    cw.value = contentWidth;
    ch.value = contentHeight;
  }, [contentWidth, contentHeight, cw, ch]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    vw.value = width;
    vh.value = height;
    setView({ w: width, h: height });
  };

  // Glide to the focused node whenever it changes (and once the viewport is measured).
  const focusX = focus?.x;
  const focusY = focus?.y;
  useEffect(() => {
    if (!view.w || focusX === undefined || focusY === undefined) {
      return;
    }
    // Animations started from the RN thread don't reliably reach the UI here, so start them on the UI thread.
    scheduleOnUI(
      (fx: number, fy: number, w: number, h: number, anchor: number) => {
        'worklet';
        const s = scale.value;
        tx.value = withSpring(w / 2 - fx * s, SPRING);
        ty.value = withSpring(h * anchor - fy * s, SPRING);
      },
      focusX,
      focusY,
      view.w,
      view.h,
      focusAnchorY,
    );
  }, [focusX, focusY, view.w, view.h, focusAnchorY, scale, tx, ty]);

  const fit = () => {
    'worklet';
    const s = clamp(
      Math.min(vw.value / cw.value, (vh.value * 0.8) / ch.value, 1),
      MIN_SCALE,
      MAX_SCALE,
    );
    scale.value = withTiming(s, { duration: 350 });
    tx.value = withTiming((vw.value - cw.value * s) / 2, { duration: 350 });
    ty.value = withTiming(Math.max(16, (vh.value * 0.8 - ch.value * s) / 2), {
      duration: 350,
    });
  };

  /** Keep at least ~40% of the viewport covered by content so the tree can't get lost. */
  const bounds = (s: number) => {
    'worklet';
    const marginX = vw.value * 0.6;
    const marginY = vh.value * 0.6;
    return {
      minX: Math.min(
        vw.value - cw.value * s - marginX,
        (vw.value - cw.value * s) / 2,
      ),
      maxX: Math.max(marginX, (vw.value - cw.value * s) / 2),
      minY: Math.min(
        vh.value - ch.value * s - marginY,
        (vh.value - ch.value * s) / 2,
      ),
      maxY: Math.max(marginY, (vh.value - ch.value * s) / 2),
    };
  };

  const pan = usePanGesture({
    minDistance: 6,
    onActivate: () => {
      'worklet';
      // nothing: changeX/changeY are applied incrementally below
    },
    onUpdate: e => {
      'worklet';
      tx.value += e.changeX;
      ty.value += e.changeY;
    },
    onDeactivate: e => {
      'worklet';
      const b = bounds(scale.value);
      tx.value = withDecay({
        velocity: e.velocityX,
        clamp: [b.minX, b.maxX],
        rubberBandEffect: true,
      });
      ty.value = withDecay({
        velocity: e.velocityY,
        clamp: [b.minY, b.maxY],
        rubberBandEffect: true,
      });
    },
  });

  const pinch = usePinchGesture({
    onUpdate: e => {
      'worklet';
      const prev = scale.value;
      const next = clamp(prev * e.scaleChange, MIN_SCALE, MAX_SCALE);
      // Zoom around the focal point: the content under the fingers stays under the fingers.
      tx.value = e.focalX - (e.focalX - tx.value) * (next / prev);
      ty.value = e.focalY - (e.focalY - ty.value) * (next / prev);
      scale.value = next;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: () => {
      'worklet';
      fit();
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch, doubleTap);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          {view.w > 0 ? (
            <>
              <NebulaLayer tx={tx} ty={ty} w={view.w} h={view.h} />
              <StarLayer
                tx={tx}
                ty={ty}
                w={view.w}
                h={view.h}
                depth={0.08}
                count={70}
                seed={1}
              />
              <StarLayer
                tx={tx}
                ty={ty}
                w={view.w}
                h={view.h}
                depth={0.25}
                count={45}
                seed={2}
              />
              <StarLayer
                tx={tx}
                ty={ty}
                w={view.w}
                h={view.h}
                depth={0.5}
                count={25}
                seed={3}
                big
              />
            </>
          ) : null}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                width: contentWidth,
                height: contentHeight,
                transformOrigin: 'top left',
              },
              contentStyle,
            ]}
            onTouchStart={() => hintVisible && setHintVisible(false)}
          >
            {children}
          </Animated.View>
        </View>
      </GestureDetector>

      <Pressable
        onPress={() => scheduleOnUI(fit)}
        accessibilityRole="button"
        accessibilityLabel="Show the whole tree"
        style={({ pressed }) => [
          styles.fitBtn,
          {
            top: controlsTop,
            backgroundColor: t.colors.surface,
            borderColor: t.colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Focus size={18} color={t.colors.primary} />
      </Pressable>
      {hintVisible ? (
        <View
          pointerEvents="none"
          style={[
            styles.hint,
            {
              top: controlsTop + 50,
              backgroundColor: `${t.colors.surface}E6`,
              borderColor: t.colors.border,
            },
          ]}
        >
          <AppText variant="caption" color={t.colors.textSecondary}>
            Drag to explore · pinch to zoom · double-tap to see all
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** One parallax layer of stars that wraps around infinitely (2×2 tiles under the viewport). */
function StarLayer({
  tx,
  ty,
  w,
  h,
  depth,
  count,
  seed,
  big,
}: {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  w: number;
  h: number;
  depth: number;
  count: number;
  seed: number;
  big?: boolean;
}) {
  const stars = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: count }, () => ({
      x: rnd() * w,
      y: rnd() * h,
      r: (big ? 1.2 : 0.5) + rnd() * (big ? 1.4 : 1),
      o: 0.2 + rnd() * 0.6,
    }));
  }, [count, seed, w, h, big]);

  const style = useAnimatedStyle(() => {
    const ox = (((tx.value * depth) % w) + w) % w;
    const oy = (((ty.value * depth) % h) + h) % h;
    return { transform: [{ translateX: ox - w }, { translateY: oy - h }] };
  });

  const tile = (key: string, dx: number, dy: number) => (
    <Svg
      key={key}
      width={w}
      height={h}
      style={{ position: 'absolute', left: dx, top: dy }}
    >
      {stars.map((st, i) => (
        <Circle
          key={i}
          cx={st.x}
          cy={st.y}
          r={st.r}
          fill="#FFFFFF"
          opacity={st.o}
        />
      ))}
    </Svg>
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, top: 0, width: w * 2, height: h * 2 },
        style,
      ]}
    >
      {tile('a', 0, 0)}
      {tile('b', w, 0)}
      {tile('c', 0, h)}
      {tile('d', w, h)}
    </Animated.View>
  );
}

/** Soft colour glows far away: one large non-repeating layer that drifts very slowly (no tile seams). */
function NebulaLayer({
  tx,
  ty,
  w,
  h,
}: {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  w: number;
  h: number;
}) {
  const t = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: clamp(tx.value * 0.04, -w * 0.9, w * 0.9) },
      { translateY: clamp(ty.value * 0.04, -h * 0.9, h * 0.9) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: -w,
          top: -h,
          width: w * 3,
          height: h * 3,
        },
        style,
      ]}
    >
      <Svg width={w * 3} height={h * 3}>
        <Defs>
          <RadialGradient id="neb1" cx="40%" cy="40%" r="30%">
            <Stop offset="0" stopColor={t.gradient[0]} stopOpacity="0.24" />
            <Stop offset="1" stopColor={t.gradient[0]} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="neb2" cx="62%" cy="62%" r="26%">
            <Stop offset="0" stopColor={t.gradient[1]} stopOpacity="0.16" />
            <Stop offset="1" stopColor={t.gradient[1]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={w * 3} height={h * 3} fill="url(#neb1)" />
        <Rect width={w * 3} height={h * 3} fill="url(#neb2)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fitBtn: {
    position: 'absolute',
    right: 16,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    top: 58,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
