import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Gem, Layers, Sparkles, Trophy } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useStudyActivity } from '../activity/useStudyActivity';
import { useTrees } from '../api/trees';
import { useAuth } from '../auth/AuthProvider';
import { StatTile, StreakDay, TreeCard } from '../components/game';
import {
  AppText,
  Button,
  Card,
  Chip,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
} from '../components/ui';
import { useConfig } from '../config/ConfigProvider';
import type { TabScreenProps } from '../navigation/types';
import { overallProgress } from '../progress/progress';
import { useTheme } from '../theme/theme';
import { Avatar, ErrorState } from './shared';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const t = useTheme();
  const { user } = useAuth();
  const { snapshot } = useConfig();
  const trees = useTrees();
  const activity = useStudyActivity();
  const list = trees.data ?? [];
  const p = overallProgress(list, snapshot.config.progression.xpPerLevel);
  const { week, streak } = activity;
  const name = user?.displayName || user?.email.split('@')[0] || '';

  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 0 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 130,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={trees.isRefetching}
            onRefresh={() => {
              trees.refetch();
            }}
            tintColor={t.colors.primary}
          />
        }
      >
        <Row gap={12}>
          <Avatar name={name} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={t.colors.textSecondary}>
              {greeting()}
            </AppText>
            <AppText variant="headline">{name}</AppText>
          </View>
          <Chip icon={Gem} label={p.earned.toLocaleString('cs-CZ')} />
        </Row>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LinearGradient
            colors={t.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 52, height: 52, borderRadius: 26, padding: 3 }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 24,
                backgroundColor: t.colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="title">{p.level}</AppText>
            </View>
          </LinearGradient>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="headline">
                Level {p.level} · {p.title}
              </AppText>
              <AppText variant="caption" color={t.colors.textSecondary}>
                {p.intoLevel} / {p.xpPerLevel} XP
              </AppText>
            </Row>
            <ProgressBar value={p.intoLevel / p.xpPerLevel} />
          </View>
        </Card>

        <Row gap={12}>
          <StatTile
            icon={Layers}
            label="Active trees"
            value={String(list.length)}
            color={t.colors.primary}
          />
          <StatTile
            icon={Trophy}
            label="Skills done"
            value={String(p.completed)}
            color={t.colors.nodeInProgress}
          />
        </Row>

        <Card style={{ gap: 16 }}>
          <Row>
            <AppText variant="headline" style={{ flex: 1 }}>
              Daily Streak
            </AppText>
            <Flame size={18} color={t.colors.nodeInProgress} />
            <AppText variant="bodyStrong" color={t.colors.nodeInProgress}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </AppText>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            {week.map((d, i) => (
              <StreakDay
                key={i}
                label={DAY_LABELS[i]}
                state={
                  d.count > 0 || d.minutes > 0
                    ? 'done'
                    : d.isToday
                    ? 'today'
                    : d.isFuture
                    ? 'upcoming'
                    : 'missed'
                }
              />
            ))}
          </Row>
        </Card>

        <SectionTitle
          title="Continue learning"
          action={list.length > 3 ? 'View all' : undefined}
          onAction={() => navigation.navigate('SkillMap')}
        />
        {trees.isError ? (
          <ErrorState error={trees.error} onRetry={() => trees.refetch()} />
        ) : null}
        {list.slice(0, 3).map(tree => (
          <TreeCard
            key={tree.id}
            tree={tree}
            onPress={() =>
              navigation.navigate('TreeDetail', { treeId: tree.id })
            }
          />
        ))}
        {trees.isSuccess && list.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <AppText variant="headline">Plant your first tree</AppText>
            <AppText
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Generate a learning path with AI or start from a ready-made
              template.
            </AppText>
            <Button
              label="Get started"
              icon={Sparkles}
              onPress={() => navigation.navigate('Generate')}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
