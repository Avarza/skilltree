import { ChevronLeft, Gem, Play, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { errorMessage } from '../api/client';
import { useDeleteTree, useSetNodeStatus, useTree } from '../api/trees';
import type { NodeStatus, TreeNode } from '../api/types';
import { NODE_BLOCK, NODE_SIZE, SkillNodeView } from '../components/game';
import {
  AppText,
  Button,
  Chip,
  IconButton,
  Loading,
  ProgressBar,
  Row,
  StatusBadge,
} from '../components/ui';
import type { RootScreenProps } from '../navigation/types';
import { layoutTree } from '../tree/layout';
import { SpaceCanvas } from '../tree/SpaceCanvas';
import { useTheme } from '../theme/theme';
import { ErrorState } from './shared';

const STATUS_LABEL: Record<NodeStatus, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  AVAILABLE: 'Available',
  LOCKED: 'Locked',
};

export function TreeDetailScreen({
  route,
  navigation,
}: RootScreenProps<'TreeDetail'>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tree = useTree(route.params.treeId);
  const setStatus = useSetNodeStatus(route.params.treeId);
  const del = useDeleteTree();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      tree.data
        ? layoutTree(tree.data.nodes, {
            minWidth: width,
            blockWidth: NODE_BLOCK.width,
            blockHeight: NODE_BLOCK.height,
            rowGap: 48,
            colGap: 24,
            padding: 32,
          })
        : null,
    [tree.data, width],
  );

  if (!tree.data) {
    return tree.isError ? (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: t.colors.background, padding: 20 }}
      >
        <ErrorState error={tree.error} onRetry={() => tree.refetch()} />
      </SafeAreaView>
    ) : (
      <Loading />
    );
  }
  const data = tree.data;
  const nodeById = new Map(data.nodes.map(n => [n.id, n]));
  const selected: TreeNode | undefined =
    (selectedId ? nodeById.get(selectedId) : undefined) ??
    data.nodes.find(n => n.status === 'IN_PROGRESS') ??
    data.nodes.find(n => n.status === 'AVAILABLE');

  const selectedPos = selected
    ? layout!.nodes.find(p => p.id === selected.id)
    : undefined;
  // Camera target: the centre of the selected node's circle.
  const focusPoint = selectedPos
    ? { x: selectedPos.x + NODE_BLOCK.width / 2, y: selectedPos.y + NODE_SIZE / 2 }
    : null;

  const change = (status: Exclude<NodeStatus, 'LOCKED'>) => {
    if (!selected) {
      return;
    }
    setStatus.mutate(
      { nodeId: selected.id, status },
      {
        onError: e =>
          Alert.alert('Could not update the skill', errorMessage(e)),
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete this tree?',
      `“${data.title}” and its progress will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            del.mutate(data.id, {
              onSuccess: () => navigation.goBack(),
              onError: e => Alert.alert('Delete failed', errorMessage(e)),
            }),
        },
      ],
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <SafeAreaView
        edges={['top']}
        style={{ paddingHorizontal: 20, gap: 10, paddingBottom: 8 }}
      >
        <Row gap={10}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[
              styles.back,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
              },
            ]}
          >
            <ChevronLeft size={20} color={t.colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={t.colors.textSecondary}>
              SKILL TREE
            </AppText>
            <AppText variant="title" numberOfLines={1}>
              {data.title}
            </AppText>
          </View>
          <Chip
            icon={Gem}
            label={`${data.completedNodes} / ${data.nodes.length}`}
          />
          <IconButton
            icon={Trash2}
            label="Delete tree"
            onPress={confirmDelete}
          />
        </Row>
        <Row gap={10}>
          <AppText variant="overline" color={t.colors.primary}>
            LV {data.level}
          </AppText>
          <View style={{ flex: 1 }}>
            <ProgressBar
              value={data.totalXp ? data.earnedXp / data.totalXp : 0}
            />
          </View>
          <AppText variant="caption" color={t.colors.textSecondary}>
            {data.earnedXp} / {data.totalXp} XP
          </AppText>
        </Row>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <SpaceCanvas
          contentWidth={layout!.width}
          contentHeight={layout!.height}
          focus={focusPoint}
        >
          <View style={{ width: layout!.width, height: layout!.height }}>
            <Svg
              width={layout!.width}
              height={layout!.height}
              style={StyleSheet.absoluteFill}
            >
              {layout!.edges
                .filter(e => !e.lit)
                .map(e => (
                  <Path
                    key={`${e.from}-${e.to}`}
                    d={e.path}
                    stroke={t.colors.nodeLocked}
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
              {layout!.edges
                .filter(e => e.lit)
                .map(e => (
                  <React.Fragment key={`${e.from}-${e.to}`}>
                    <Path
                      d={e.path}
                      stroke={t.colors.nodeCompleted}
                      strokeWidth={7}
                      opacity={0.18}
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={e.path}
                      stroke={t.colors.nodeCompleted}
                      strokeWidth={2}
                      fill="none"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </React.Fragment>
                ))}
              {layout!.edges.map(e => {
                const m = /V(\d+(?:\.\d+)?) H/.exec(e.path);
                const start = /^M(\S+) /.exec(e.path);
                return m && start ? (
                  <Circle
                    key={`j-${e.from}-${e.to}`}
                    cx={Number(start[1])}
                    cy={Number(m[1])}
                    r={3}
                    fill={e.lit ? t.colors.nodeCompleted : t.colors.nodeLocked}
                  />
                ) : null;
              })}
            </Svg>
            {layout!.nodes.map(p => {
              const n = nodeById.get(p.id)!;
              return (
                <View
                  key={p.id}
                  style={{ position: 'absolute', left: p.x, top: p.y }}
                >
                  <SkillNodeView
                    title={n.title}
                    xp={n.xp}
                    status={n.status}
                    selected={selected?.id === n.id}
                    onPress={() => setSelectedId(n.id)}
                  />
                </View>
              );
            })}
          </View>
        </SpaceCanvas>
      </View>

      {selected ? (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
          <Row>
            <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
              {selected.title}
            </AppText>
            <StatusBadge
              label={STATUS_LABEL[selected.status]}
              color={t.nodeColor(
                selected.status === 'LOCKED' ? 'LOCKED' : selected.status,
              )}
            />
          </Row>
          {selected.description ? (
            <AppText variant="body" color={t.colors.textSecondary}>
              {selected.description}
            </AppText>
          ) : null}
          <NodeActions
            node={selected}
            busy={setStatus.isPending}
            onChange={change}
            onStartSession={() =>
              navigation.navigate('SkillSession', {
                treeId: data.id,
                nodeId: selected.id,
              })
            }
            requiresTitles={selected.requires.map(
              r => nodeById.get(r)?.title ?? r,
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

function NodeActions({
  node,
  busy,
  onChange,
  onStartSession,
  requiresTitles,
}: {
  node: TreeNode;
  busy: boolean;
  onChange: (s: Exclude<NodeStatus, 'LOCKED'>) => void;
  onStartSession: () => void;
  requiresTitles: string[];
}) {
  const t = useTheme();
  switch (node.status) {
    case 'LOCKED':
      return (
        <AppText variant="caption" color={t.colors.textSecondary}>
          Unlocks after: {requiresTitles.join(', ')}
        </AppText>
      );
    case 'AVAILABLE':
      return (
        <Row gap={10}>
          <Button
            label="Mark done"
            variant="secondary"
            onPress={() => onChange('COMPLETED')}
            disabled={busy}
          />
          <Button
            label="Start practice"
            icon={Play}
            onPress={onStartSession}
            style={{ flex: 1 }}
          />
        </Row>
      );
    case 'IN_PROGRESS':
      return (
        <Row gap={10}>
          <Button
            label="Mark done"
            variant="secondary"
            onPress={() => onChange('COMPLETED')}
            loading={busy}
          />
          <Button
            label="Continue practice"
            icon={Play}
            onPress={onStartSession}
            style={{ flex: 1 }}
          />
        </Row>
      );
    case 'COMPLETED':
      return (
        <Button
          label="Mark as not done"
          variant="ghost"
          onPress={() => onChange('AVAILABLE')}
          loading={busy}
        />
      );
  }
}

const styles = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2 },
});
