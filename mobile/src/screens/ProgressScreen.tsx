import { LinearGradient } from 'expo-linear-gradient';
import { Gem } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { useStudyActivity } from '../activity/useStudyActivity';
import { useTrees } from '../api/trees';
import { AchievementRow } from '../components/game';
import {
  AppText,
  Card,
  Chip,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
} from '../components/ui';
import { useConfig } from '../config/ConfigProvider';
import { achievements, overallProgress } from '../progress/progress';
import { fonts, useTheme } from '../theme/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROWS = 10;

export function ProgressScreen() {
  const t = useTheme();
  const { snapshot } = useConfig();
  const trees = useTrees().data ?? [];
  const activity = useStudyActivity();
  const p = overallProgress(trees, snapshot.config.progression.xpPerLevel);
  const { week, weekMinutes } = activity;
  const list = achievements(trees, activity.log);
  const unlocked = list.filter(a => a.unlocked).length;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <AppText variant="overline" color={t.colors.textSecondary}>
            THIS WEEK
          </AppText>
          <AppText variant="display">Progress</AppText>
        </View>
        <Chip icon={Gem} label={`${p.earned} XP`} />
      </Row>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <LinearGradient
          colors={t.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="title" color="#04161C">
            {p.level}
          </AppText>
        </LinearGradient>
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="headline">
              Level {p.level} · {p.title}
            </AppText>
            <AppText variant="caption" color={t.colors.textSecondary}>
              {p.toNext} XP to LV {p.level + 1}
            </AppText>
          </Row>
          <ProgressBar value={p.intoLevel / p.xpPerLevel} />
        </View>
      </Card>

      <Row gap={10}>
        {[
          [String(p.completed), 'Skills done'],
          [String(unlocked), 'Titles earned'],
          [String(activity.streak), 'Day streak'],
        ].map(([v, l]) => (
          <Card
            key={l}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              paddingVertical: 12,
            }}
          >
            <AppText variant="title">{v}</AppText>
            <AppText variant="caption" color={t.colors.textSecondary}>
              {l}
            </AppText>
          </Card>
        ))}
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="headline">Study time</AppText>
          <AppText variant="caption" color={t.colors.primary}>
            {weekMinutes >= 60
              ? `${(weekMinutes / 60).toFixed(1)} h`
              : `${weekMinutes} min`}{' '}
            this week
          </AppText>
        </Row>
        <DotChart
          counts={week.map(d => d.minutes)}
          todayIndex={week.findIndex(d => d.isToday)}
        />
        <AppText variant="caption" color={t.colors.textSecondary}>
          Focused minutes per day · from practice sessions
        </AppText>
      </Card>

      <SectionTitle
        title="Achievements"
        action={`${unlocked} / ${list.length}`}
      />
      {list.map(a => (
        <AchievementRow
          key={a.id}
          title={a.title}
          description={a.description}
          unlocked={a.unlocked}
          meta={a.meta}
        />
      ))}
    </Screen>
  );
}

/** Dot-matrix bar chart from the design: 3 dot columns per day, the tallest dot glows white. */
function DotChart({
  counts,
  todayIndex,
}: {
  counts: number[];
  todayIndex: number;
}) {
  const t = useTheme();
  const W = 320,
    H = 150,
    left = 22,
    base = 120,
    gap = 10.5,
    dot = 3;
  const colW = (W - left) / 7;
  const max = Math.max(30, ...counts);
  return (
    <Svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      accessibilityLabel={`Minutes studied this week: ${counts.join(', ')}`}
    >
      {[0, Math.round(max / 2), max].map(v => (
        <SvgText
          key={v}
          x={0}
          y={base - (v / max) * (ROWS - 1) * gap + 3}
          fill={t.colors.textSecondary}
          fontSize={9}
          fontFamily={fonts.bold}
        >
          {v}
        </SvgText>
      ))}
      {counts.map((c, d) => {
        const lit = Math.round((c / max) * ROWS);
        return [0, 1, 2].map(col => {
          const colLit =
            col === 1 ? lit : Math.max(0, lit - 1 - ((d + col) % 2));
          return Array.from({ length: ROWS }, (_, r) => {
            const on = r < colLit;
            const peak = col === 1 && r === lit - 1;
            return (
              <Circle
                key={`${d}-${col}-${r}`}
                cx={left + d * colW + colW / 2 - 9 + col * 9}
                cy={base - r * gap}
                r={dot}
                fill={
                  peak
                    ? '#FFFFFF'
                    : on
                    ? t.colors.primary
                    : t.colors.surfaceMuted
                }
                opacity={on && !peak ? 0.45 + (r / ROWS) * 0.55 : 1}
              />
            );
          });
        });
      })}
      {DAYS.map((d, i) => (
        <SvgText
          key={d}
          x={left + i * colW + colW / 2}
          y={base + 22}
          fill={i === todayIndex ? t.colors.primary : t.colors.textSecondary}
          fontSize={10}
          fontFamily={fonts.bold}
          textAnchor="middle"
        >
          {d}
        </SvgText>
      ))}
    </Svg>
  );
}
