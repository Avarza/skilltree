import { Gem, Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import { useTrees } from '../api/trees';
import type { SkillTree } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { CATEGORY_COLORS, iconForTree } from '../components/icons';
import { AppText, Button, Card, Chip, Row } from '../components/ui';
import { useConfig } from '../config/ConfigProvider';
import type { TabScreenProps } from '../navigation/types';
import { overallProgress, treeProgress } from '../progress/progress';
import { SpaceCanvas } from '../tree/SpaceCanvas';
import { useTheme } from '../theme/theme';
import { Avatar, ErrorState } from './shared';

const ORB = 54;
const INNER_RING = 8;
const R1 = 170;
const R2 = 300;

/** Places trees on two rings around the user: the first 8 close, the rest further out. */
function galaxyLayout(count: number) {
  const outer = Math.max(0, count - INNER_RING);
  const radius = outer > 0 ? R2 : R1;
  const size = radius * 2 + 220;
  const c = size / 2;
  const points = Array.from({ length: count }, (_, i) => {
    const onInner = i < INNER_RING;
    const n = onInner ? Math.min(count, INNER_RING) : outer;
    const k = onInner ? i : i - INNER_RING;
    // Offset the outer ring by half a step so planets sit between the inner ones.
    const a =
      -Math.PI / 2 + (k * 2 * Math.PI) / n + (onInner ? 0 : Math.PI / n);
    const r = onInner ? R1 : R2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  });
  return { size, center: c, points };
}

export function SkillMapScreen({ navigation }: TabScreenProps<'SkillMap'>) {
  const t = useTheme();
  const { user } = useAuth();
  const { snapshot } = useConfig();
  const trees = useTrees();
  const list = useMemo(() => trees.data ?? [], [trees.data]);
  const p = overallProgress(list, snapshot.config.progression.xpPerLevel);
  const g = useMemo(() => galaxyLayout(list.length), [list.length]);
  const name = user?.displayName || user?.email.split('@')[0] || '';
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {list.length > 0 ? (
        <SpaceCanvas
          contentWidth={g.size}
          contentHeight={g.size}
          focus={{ x: g.center, y: g.center }}
          focusAnchorY={0.5}
          controlsTop={insets.top + 76}
        >
          <Svg width={g.size} height={g.size} style={{ position: 'absolute' }}>
            {g.points.map((pt, i) => (
              <Line
                key={list[i].id}
                x1={g.center}
                y1={g.center}
                x2={pt.x}
                y2={pt.y}
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={list[i].completedNodes === 0 ? 0.3 : 0.75}
              />
            ))}
          </Svg>
          {list.map((tree, i) => (
            <Planet
              key={tree.id}
              tree={tree}
              color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              x={g.points[i].x}
              y={g.points[i].y}
              onPress={() =>
                navigation.navigate('TreeDetail', { treeId: tree.id })
              }
            />
          ))}
          <View
            style={{
              position: 'absolute',
              left: g.center - 60,
              top: g.center - 30,
              width: 120,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                shadowColor: t.glow,
                shadowOpacity: 0.7,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <Avatar name={name} size={60} />
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
              }}
            >
              <AppText variant="bodyStrong">You · LV {p.level}</AppText>
            </View>
          </View>
        </SpaceCanvas>
      ) : null}

      {/* Header floats above the space canvas. */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingHorizontal: 20,
        }}
      >
        <Row
          style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}
          gap={8}
        >
          <View pointerEvents="none">
            <AppText variant="overline" color={t.colors.textSecondary}>
              YOUR SKILL GALAXY
            </AppText>
            <AppText variant="display">All trees</AppText>
          </View>
          <Chip icon={Gem} label={`LV ${p.level} · ${p.earned}`} />
        </Row>
        {trees.isError ? (
          <View style={{ marginTop: 16 }}>
            <ErrorState error={trees.error} onRetry={() => trees.refetch()} />
          </View>
        ) : null}
        {trees.isSuccess && list.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 10, marginTop: 40 }}>
            <AppText variant="headline">Your galaxy is empty</AppText>
            <AppText
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Every tree you start becomes a planet around you.
            </AppText>
            <Button
              label="Create a tree"
              icon={Sparkles}
              onPress={() => navigation.navigate('Generate')}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function Planet({
  tree,
  color,
  x,
  y,
  onPress,
}: {
  tree: SkillTree;
  color: string;
  x: number;
  y: number;
  onPress: () => void;
}) {
  const t = useTheme();
  const Icon = iconForTree(tree);
  const pct = treeProgress(tree);
  const fresh = tree.completedNodes === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tree.title}, ${Math.round(pct * 100)} percent`}
      style={({ pressed }) => ({
        position: 'absolute',
        left: x - 55,
        top: y - ORB / 2,
        width: 110,
        alignItems: 'center',
        gap: 4,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View
        style={{
          width: ORB,
          height: ORB,
          borderRadius: ORB / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surface,
          borderWidth: 2,
          borderColor: color,
          opacity: fresh ? 0.6 : 1,
          shadowColor: color,
          shadowOpacity: fresh ? 0 : 0.6,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Icon size={24} color={color} />
      </View>
      {/* Backing so connector lines pass under the label instead of through it. */}
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 8,
          backgroundColor: `${t.colors.background}D9`,
          maxWidth: 110,
        }}
      >
        <AppText variant="caption" numberOfLines={1}>
          {tree.title}
        </AppText>
        <AppText
          variant="overline"
          color={fresh ? t.colors.textSecondary : color}
        >
          {fresh ? 'not started' : `${Math.round(pct * 100)}%`}
        </AppText>
      </View>
    </Pressable>
  );
}
