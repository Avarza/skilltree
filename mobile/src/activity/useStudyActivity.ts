import { useMemo } from 'react';

import { useSessions } from '../api/practice';
import {
  currentStreak,
  useActivity,
  weekActivity,
  type ActivityEntry,
} from './activityLog';

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Combines server-side study sessions (focused minutes) with locally logged completions:
 * - week: Mon–Sun with minutes studied and skills completed per day,
 * - streak: consecutive days with any study session or completion.
 */
export function useStudyActivity() {
  const log = useActivity();
  // 35 days back is enough for the streak and always covers the current week. Day granularity keeps the
  // query key stable across renders.
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 35);
    return d;
  }, []);
  const sessions = useSessions(since);

  return useMemo(() => {
    const list = sessions.data ?? [];
    const week = weekActivity(log).map(day => {
      const seconds = list
        .filter(s => sameDay(new Date(s.endedAt), day.date))
        .reduce((sum, s) => sum + s.durationSeconds, 0);
      return { ...day, minutes: Math.round(seconds / 60) };
    });
    const combined: ActivityEntry[] = [
      ...log,
      ...list.map(s => ({
        treeId: s.treeId,
        nodeId: s.nodeId,
        xp: 0,
        at: s.endedAt,
      })),
    ];
    return {
      week,
      weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
      streak: currentStreak(combined),
      log: combined,
      isLoading: sessions.isPending,
    };
  }, [log, sessions.data, sessions.isPending]);
}
