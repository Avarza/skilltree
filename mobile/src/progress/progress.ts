import type { NodeStatus, SkillTree } from '../api/types';
import type { ActivityEntry } from '../activity/activityLog';
import { currentStreak } from '../activity/activityLog';

export function overallProgress(trees: SkillTree[], xpPerLevel: number) {
  const earned = trees.reduce((s, t) => s + t.earnedXp, 0);
  const completed = trees.reduce((s, t) => s + t.completedNodes, 0);
  const level = Math.floor(earned / xpPerLevel) + 1;
  const intoLevel = earned % xpPerLevel;
  return { earned, completed, level, intoLevel, xpPerLevel, toNext: xpPerLevel - intoLevel, title: levelTitle(level) };
}

export function levelTitle(level: number) {
  const titles = ['Newcomer', 'Apprentice', 'Learner', 'Explorer', 'Builder', 'Achiever', 'Expert', 'Master'];
  return titles[Math.min(level - 1, titles.length - 1)];
}

export function treeProgress(tree: SkillTree) {
  return tree.nodes.length ? tree.completedNodes / tree.nodes.length : 0;
}

export function nextNode(tree: SkillTree) {
  const order: NodeStatus[] = ['IN_PROGRESS', 'AVAILABLE'];
  for (const s of order) {
    const n = tree.nodes.find(x => x.status === s);
    if (n) {
      return n;
    }
  }
  return null;
}

export type Achievement = { id: string; title: string; description: string; unlocked: boolean; meta: string };

/** Achievements derived from data the app already has (no backend support needed). */
export function achievements(trees: SkillTree[], log: ActivityEntry[]): Achievement[] {
  const done = trees.reduce((s, t) => s + t.completedNodes, 0);
  const finishedTrees = trees.filter(t => t.nodes.length > 0 && t.completedNodes === t.nodes.length).length;
  const streak = currentStreak(log);
  const aiTrees = trees.filter(t => t.source === 'AI').length;
  const progress = (value: number, goal: number) => ({ unlocked: value >= goal, meta: value >= goal ? 'done' : `${value} / ${goal}` });
  return [
    { id: 'first-step', title: 'First Step', description: 'Complete your first skill', ...progress(done, 1) },
    { id: 'ai-explorer', title: 'AI Explorer', description: 'Generate a skill tree with AI', ...progress(aiTrees, 1) },
    { id: 'week-warrior', title: 'Week Warrior', description: 'Keep a 7-day learning streak', ...progress(streak, 7) },
    { id: 'ten-skills', title: 'Skill Collector', description: 'Complete 10 skills', ...progress(done, 10) },
    { id: 'tree-master', title: 'Tree Master', description: 'Finish a whole skill tree', ...progress(finishedTrees, 1) },
  ];
}
