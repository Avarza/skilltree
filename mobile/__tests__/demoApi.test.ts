jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
});

import type { Practice, StudySession } from '../src/api/practice';
import type { SkillTree } from '../src/api/types';
import { demoRequest, resetDemo } from '../src/demo/demoApi';

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  await resetDemo();
});
afterEach(() => jest.useRealTimers());

/** demoRequest waits a little to mimic the network; skip the wait. */
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  // Attach handlers before advancing timers so a rejection isn't reported as unhandled.
  const settled = demoRequest<T>(path, method, body).then(
    value => ({ ok: true as const, value }),
    error => ({ ok: false as const, error }),
  );
  await jest.runAllTimersAsync();
  const r = await settled;
  if (!r.ok) {
    throw r.error;
  }
  return r.value;
}

test('seeds sample trees with derived statuses and XP', async () => {
  const trees = await call<SkillTree[]>('/api/v1/trees');
  expect(trees.length).toBe(3);
  const ts = trees.find(t => t.id === 'demo-typescript')!;
  expect(ts.completedNodes).toBe(3);
  expect(ts.earnedXp).toBe(250);
  expect(ts.nodes.find(n => n.id === 'generics')!.status).toBe('LOCKED');
  expect(ts.nodes.find(n => n.id === 'interfaces')!.status).toBe('IN_PROGRESS');
});

test('completing a skill unlocks the skills that need it', async () => {
  const tree = await call<SkillTree>('/api/v1/trees/demo-typescript/nodes/interfaces', 'PATCH', { status: 'COMPLETED' });
  expect(tree.nodes.find(n => n.id === 'unions')!.status).toBe('AVAILABLE');
  expect(tree.nodes.find(n => n.id === 'generics')!.status).toBe('AVAILABLE');
});

test('locked skills and skills with started dependents are rejected like on the server', async () => {
  await expect(call('/api/v1/trees/demo-typescript/nodes/capstone', 'PATCH', { status: 'IN_PROGRESS' })).rejects.toMatchObject({
    status: 409,
    code: 'node_locked',
  });
  await expect(call('/api/v1/trees/demo-typescript/nodes/basic-types', 'PATCH', { status: 'AVAILABLE' })).rejects.toMatchObject({
    code: 'has_dependents',
  });
});

test('practice, generated trees and sessions work offline', async () => {
  const practice = await call<Practice>('/api/v1/trees/demo-typescript/nodes/interfaces/practice');
  expect(practice.quiz.length).toBeGreaterThan(0);
  const generic = await call<Practice>('/api/v1/trees/demo-spanish/nodes/food/practice');
  expect(generic.tasks.length).toBe(3);
  expect(generic.quiz[0].options[generic.quiz[0].correctIndex]).toBe('Numbers 0–100');

  const generated = await call<SkillTree>('/api/v1/trees/generate', 'POST', { topic: 'chess', level: 'beginner' });
  expect(generated.title).toBe('Chess');
  expect(generated.nodes.filter(n => n.status === 'AVAILABLE').length).toBe(2);

  const since = new Date(Date.now() - 60_000).toISOString();
  await call('/api/v1/trees/demo-guitar/nodes/open-chords/sessions', 'POST', { durationSeconds: 900 });
  const recent = await call<StudySession[]>(`/api/v1/sessions?since=${encodeURIComponent(since)}`);
  expect(recent).toHaveLength(1);
  expect(recent[0]).toMatchObject({ nodeId: 'open-chords', durationSeconds: 900 });
});
