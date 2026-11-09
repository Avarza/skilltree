import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Local log of completed skills, used for streaks and the weekly activity chart.
 * The backend does not track completion dates yet (TODO: move to an /activity endpoint).
 */
export type ActivityEntry = { treeId: string; nodeId: string; xp: number; at: string };

const KEY = 'skilltree.activity.v1';
const MAX_ENTRIES = 1000;
let entries: ActivityEntry[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());

export async function loadActivity() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    entries = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    entries = [];
  }
  emit();
}

export function recordCompletion(e: Omit<ActivityEntry, 'at'>) {
  entries = [...entries, { ...e, at: new Date().toISOString() }].slice(-MAX_ENTRIES);
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(entries)).catch(() => {});
}

export function clearActivity() {
  entries = [];
  emit();
  AsyncStorage.removeItem(KEY).catch(() => {});
}

export function useActivity(): ActivityEntry[] {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => entries,
  );
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Monday-first days of the current week with the number of skills completed on each. */
export function weekActivity(log: ActivityEntry[], now = new Date()) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const counts = new Map<string, { count: number; xp: number }>();
  for (const e of log) {
    const k = dayKey(new Date(e.at));
    const c = counts.get(k) ?? { count: 0, xp: 0 };
    counts.set(k, { count: c.count + 1, xp: c.xp + e.xp });
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const c = counts.get(dayKey(d)) ?? { count: 0, xp: 0 };
    const isToday = dayKey(d) === dayKey(now);
    return { date: d, ...c, isToday, isFuture: d > now && !isToday };
  });
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one completion. */
export function currentStreak(log: ActivityEntry[], now = new Date()) {
  const days = new Set(log.map(e => dayKey(new Date(e.at))));
  const d = new Date(now);
  if (!days.has(dayKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
