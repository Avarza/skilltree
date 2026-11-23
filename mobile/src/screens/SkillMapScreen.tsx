import { Gem, Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

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

const ORB = 62;
const MAP_WIDTH = 440;
const CENTER_X = MAP_WIDTH / 2;
const HUB_Y = 190;

/** A vertical circuit with staggered branches, based on the skill-tree reference. */
function circuitLayout(count: number) {
  const points = Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? 105 : 335,
    y: 360 + Math.floor(i / 2) * 190 + (i % 2) * 65,
  }));
  return {
    width: MAP_WIDTH,
    height: Math.max(740, (points.at(-1)?.y ?? 360) + 200),
    points,
  };
}

export function SkillMapScreen({ navigation }: TabScreenProps<'SkillMap'>) {
  const t = useTheme();
  const { user } = useAuth();
  const { snapshot } = useConfig();
  const trees = useTrees();
  const list = useMemo(() => trees.data ?? [], [trees.data]);
  const p = overallProgress(list, snapshot.config.progression.xpPerLevel);
  const g = useMemo(() => circuitLayout(list.length), [list.length]);
  const name = user?.displayName || user?.email.split('@')[0] || '';
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {list.length > 0 ? (
        <SpaceCanvas
          contentWidth={g.width}
          contentHeight={g.height}
          focus={{ x: CENTER_X, y: HUB_Y + 95 }}
          focusAnchorY={0.43}
          controlsTop={insets.top + 76}
        >
          <Svg width={g.width} height={g.height} style={{ position: 'absolute' }}>
            <Path
              d={`M ${CENTER_X} ${HUB_Y + 42} V ${(g.points.at(-1)?.y ?? HUB_Y) + 22}`}
              stroke={t.colors.primary}
              strokeWidth={2}
              opacity={0.35}
            />
            {g.points.map((pt, i) => (
              <React.Fragment key={list[i].id}>
                <Path
                  d={`M ${CENTER_X} ${pt.y - 22} V ${pt.y} H ${pt.x}`}
                  stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  opacity={list[i].completedNodes === 0 ? 0.4 : 0.85}
                  fill="none"
                />
                <Circle cx={CENTER_X} cy={pt.y - 22} r={3} fill={t.colors.primary} opacity={0.65} />
              </React.Fragment>
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
              left: CENTER_X - 70,
              top: HUB_Y - 62,
              width: 140,
              alignItems: 'center',
              gap: 12,
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
              <View style={{ padding: 10, borderRadius: 50, borderWidth: 2, borderColor: t.colors.primary, backgroundColor: t.colors.surface }}>
                <Avatar name={name} size={60} />
              </View>
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
              <AppText variant="bodyStrong">You · Level {p.level}</AppText>
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
              YOUR SKILL TREE
            </AppText>
            <AppText variant="display">Skill map</AppText>
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
            <AppText variant="headline">Your skill tree is empty</AppText>
            <AppText
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Every course you start adds a new branch to your map.
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
