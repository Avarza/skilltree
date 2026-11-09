import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight, Check, Lock, Play, Star, Trophy, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Polygon, Stop } from 'react-native-svg';

import type { NodeStatus, SkillTree } from '../api/types';
import { treeProgress } from '../progress/progress';
import { useTheme } from '../theme/theme';
import { iconForTree } from './icons';
import { AppText, Card, hexAlpha, ProgressBar, Row } from './ui';

// ---------------------------------------------------------------------------------------------------------------
// Skill node (circle with neon ring + glow), used in the tree canvas

const NODE_ICON: Record<NodeStatus, LucideIcon> = { COMPLETED: Check, IN_PROGRESS: Play, AVAILABLE: Star, LOCKED: Lock };

export const NODE_SIZE = 54;
/** Fixed footprint of a node incl. a 2-line title, so connectors never cross the labels. */
export const NODE_BLOCK = { width: 104, height: 126 };

export function SkillNodeView({
  title,
  xp,
  status,
  selected,
  onPress,
}: {
  title: string;
  xp: number;
  status: NodeStatus;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const color = t.nodeColor(status);
  const locked = status === 'LOCKED';
  const Icon = NODE_ICON[status];
  const radius = t.nodeShape === 'rounded' ? 20 : NODE_SIZE / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status.toLowerCase().replace('_', ' ')}, ${xp} XP`}
      style={{ width: NODE_BLOCK.width, height: NODE_BLOCK.height, alignItems: 'center', gap: 6 }}>
      <View style={{ width: NODE_SIZE + 16, height: NODE_SIZE + 16, alignItems: 'center', justifyContent: 'center', margin: -8 }}>
        {selected ? <View style={[StyleSheet.absoluteFill, { borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color }]} /> : null}
        <View
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: radius,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: locked ? t.colors.surface : blend(t.colors.surface, color, 0.16),
            borderWidth: t.nodeBorder,
            borderColor: color,
            shadowColor: color,
            shadowOpacity: locked ? 0 : 0.7,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 0 },
            elevation: locked ? 0 : 8,
          }}>
          <Icon size={21} color={locked ? t.colors.textSecondary : color} strokeWidth={2} />
        </View>
      </View>
      {/* Backing so connector lines pass under the label instead of through it. */}
      <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: `${t.colors.background}D9` }}>
        <AppText variant="caption" color={locked ? t.colors.textSecondary : t.colors.textPrimary} numberOfLines={2} style={{ textAlign: 'center' }}>
          {title}
        </AppText>
        <AppText variant="overline" color={status === 'COMPLETED' ? color : t.colors.textSecondary}>
          {status === 'COMPLETED' ? `+${xp} XP` : `${xp} XP`}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Mix two #RRGGBB colors (used for the subtle node tint on an opaque surface). */
function blend(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Tree card

export function TreeCard({ tree, onPress }: { tree: SkillTree; onPress?: () => void }) {
  const t = useTheme();
  const Icon = iconForTree(tree);
  const pct = treeProgress(tree);
  const subtitle =
    tree.source === 'AI' ? `AI generated · ${tree.completedNodes} / ${tree.nodes.length} skills` : `Level ${tree.level} · ${tree.earnedXp} / ${tree.totalXp} XP`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tree.title}, ${Math.round(pct * 100)} percent`}>
      {({ pressed }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.85 : 1 }}>
          <View style={[styles.tile, { backgroundColor: hexAlpha(t.colors.primary, 0.12) }]}>
            <Icon size={24} color={t.colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="headline" numberOfLines={1}>
              {tree.title}
            </AppText>
            <AppText variant="caption" color={t.colors.textSecondary} numberOfLines={1}>
              {subtitle}
            </AppText>
            <ProgressBar value={pct} />
          </View>
          <View style={[styles.arrow, { backgroundColor: t.colors.surfaceMuted }]}>
            <ArrowUpRight size={18} color={t.colors.primary} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Streak day (scalloped seal)

const SEAL = (() => {
  const pts: string[] = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? 17 : 14;
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    pts.push(`${(17 + r * Math.cos(a)).toFixed(2)},${(17 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
})();

export function StreakDay({ label, state }: { label: string; state: 'done' | 'today' | 'missed' | 'upcoming' }) {
  const t = useTheme();
  const done = state === 'done';
  return (
    <View style={{ alignItems: 'center', gap: 8 }} accessibilityLabel={`${label}: ${state}`}>
      <AppText variant="overline" color={state === 'today' ? t.colors.textPrimary : t.colors.textSecondary}>
        {label}
      </AppText>
      <View style={done ? { shadowColor: t.glow, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : undefined}>
        <Svg width={34} height={34}>
          <Defs>
            <SvgGradient id="seal" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={t.gradient[0]} />
              <Stop offset="1" stopColor={t.gradient[1]} />
            </SvgGradient>
          </Defs>
          <Polygon
            points={SEAL}
            fill={done ? 'url(#seal)' : t.colors.surfaceMuted}
            opacity={state === 'missed' ? 0.5 : 1}
            stroke={state === 'today' ? t.colors.primary : 'none'}
            strokeWidth={1.5}
            strokeDasharray={state === 'today' ? '3 2' : undefined}
          />
        </Svg>
        {done ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Stat tile & achievement

export function StatTile({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <Card style={{ flex: 1, gap: 18 }}>
      <Row>
        <Icon size={20} color={color} strokeWidth={2} />
        <AppText variant="bodyStrong">{label}</AppText>
      </Row>
      <AppText variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
        {value}
      </AppText>
    </Card>
  );
}

export function AchievementRow({ title, description, unlocked, meta }: { title: string; description: string; unlocked: boolean; meta: string }) {
  const t = useTheme();
  return (
    <View style={[styles.achievement, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      {unlocked ? (
        <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medal}>
          <Trophy size={20} color="#04161C" />
        </LinearGradient>
      ) : (
        <View style={[styles.medal, { backgroundColor: t.colors.surfaceMuted }]}>
          <Lock size={20} color={t.colors.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" color={unlocked ? t.colors.textPrimary : t.colors.textSecondary}>
          {title}
        </AppText>
        <AppText variant="caption" color={t.colors.textSecondary}>
          {description}
        </AppText>
      </View>
      <AppText variant="overline" color={unlocked ? t.colors.nodeCompleted : t.colors.textSecondary}>
        {meta}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  medal: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
