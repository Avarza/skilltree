import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '../api/client';
import type { NodeStatus, SkillTree } from '../api/types';
import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { generatedTree, genericPractice, PRACTICE, seedState, type DemoNode, type DemoState, type DemoTree } from './demoData';

/**
 * Offline backend for the demo mode: answers the same /api/v1 paths as the Spring Boot API from a
 * local store (AsyncStorage), with the same unlocking rules. Lets the app be tried without a server.
 */
const KEY = 'skilltree.demo.v1';
let state: DemoState | null = null;

async function load(): Promise<DemoState> {
  if (state) {
    return state;
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    state = null;
  }
  if (!state || state.version !== 1) {
    state = seedState();
    await save();
  }
  return state;
}

async function save() {
  await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export async function resetDemo() {
  state = null;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** Mirrors TreeService.normalize: LOCKED/AVAILABLE follow prerequisites, started work is kept while unlocked. */
function normalize(nodes: DemoNode[]): DemoNode[] {
  const status = new Map(nodes.map(x => [x.id, x.status]));
  return nodes.map(x => {
    const unlocked = x.requires.every(r => status.get(r) === 'COMPLETED');
    if (!unlocked) {
      return { ...x, status: 'LOCKED' };
    }
    return !x.status || x.status === 'LOCKED' ? { ...x, status: 'AVAILABLE' } : x;
  });
}

function view(tree: DemoTree): SkillTree {
  const nodes = normalize(tree.nodes).map(x => ({ ...x, status: x.status as NodeStatus }));
  const done = nodes.filter(x => x.status === 'COMPLETED');
  const earnedXp = done.reduce((s, x) => s + x.xp, 0);
  return {
    ...tree,
    nodes,
    earnedXp,
    totalXp: nodes.reduce((s, x) => s + x.xp, 0),
    level: Math.floor(earnedXp / DEFAULT_CONFIG.config.progression.xpPerLevel) + 1,
    completedNodes: done.length,
  };
}

const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found`);
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function demoRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  // A short pause keeps loading states and animations looking like the real app.
  await delay(method === 'POST' && path.endsWith('/generate') ? 1400 : 180);
  const s = await load();
  const [pathname, query = ''] = path.split('?');
  const parts = pathname.replace(/^\/api\/v1\//, '').split('/').map(decodeURIComponent);
  const findTree = (id: string) => {
    const tree = s.trees.find(t => t.id === id);
    if (!tree) {
      throw notFound('Skill tree');
    }
    return tree;
  };
  const findNode = (tree: DemoTree, nodeId: string) => {
    const node = normalize(tree.nodes).find(x => x.id === nodeId);
    if (!node) {
      throw notFound(`Node '${nodeId}'`);
    }
    return node;
  };

  // /trees
  if (parts[0] === 'trees' && parts.length === 1 && method === 'GET') {
    return [...s.trees].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(view) as T;
  }
  if (parts[0] === 'trees' && parts[1] === 'generate' && method === 'POST') {
    const req = body as { topic: string; level: string; goal?: string };
    if (!req?.topic?.trim()) {
      throw new ApiError(400, 'validation_failed', 'Topic is required');
    }
    const tree = generatedTree(req.topic, req.level, req.goal);
    s.trees.unshift(tree);
    await save();
    return view(tree) as T;
  }
  if (parts[0] === 'trees' && parts[1] === 'from-template') {
    throw new ApiError(503, 'demo_unavailable', 'Templates come from the CMS and need the server. Try “Generate” instead.');
  }
  if (parts[0] === 'trees' && parts.length === 2) {
    const tree = findTree(parts[1]);
    if (method === 'DELETE') {
      s.trees = s.trees.filter(t => t.id !== tree.id);
      await save();
      return undefined as T;
    }
    return view(tree) as T;
  }

  // /trees/{id}/nodes/{nodeId}[/practice|/sessions]
  if (parts[0] === 'trees' && parts[2] === 'nodes' && parts.length >= 4) {
    const tree = findTree(parts[1]);
    const node = findNode(tree, parts[3]);
    if (parts.length === 4 && method === 'PATCH') {
      const status = (body as { status: NodeStatus }).status;
      if (node.status === 'LOCKED') {
        throw new ApiError(409, 'node_locked', 'Complete the prerequisites first');
      }
      if (status !== 'COMPLETED' && node.status === 'COMPLETED') {
        const current = normalize(tree.nodes);
        const started = current.some(
          x => x.requires.includes(node.id) && (x.status === 'IN_PROGRESS' || x.status === 'COMPLETED'),
        );
        if (started) {
          throw new ApiError(409, 'has_dependents', 'Skills that build on this one are already started');
        }
      }
      tree.nodes = normalize(tree.nodes.map(x => (x.id === node.id ? { ...x, status } : x)));
      tree.updatedAt = new Date().toISOString();
      await save();
      return view(tree) as T;
    }
    if (parts[4] === 'practice' && method === 'GET') {
      return (PRACTICE[node.id] ?? genericPractice(tree, node)) as T;
    }
    if (parts[4] === 'sessions' && method === 'POST') {
      const seconds = Math.max(1, Math.round((body as { durationSeconds: number }).durationSeconds));
      const session = { id: s.nextSessionId++, treeId: tree.id, nodeId: node.id, durationSeconds: seconds, endedAt: new Date().toISOString() };
      s.sessions.push(session);
      await save();
      return session as T;
    }
  }

  // /sessions?since=
  if (parts[0] === 'sessions' && method === 'GET') {
    // URLSearchParams.get is not implemented in React Native.
    const since = /(?:^|&)since=([^&]*)/.exec(query)?.[1];
    const from = since ? new Date(decodeURIComponent(since)).getTime() : 0;
    return s.sessions.filter(x => new Date(x.endedAt).getTime() >= from) as T;
  }

  throw new ApiError(404, 'not_found', `Demo mode does not support ${method} ${pathname}`);
}
