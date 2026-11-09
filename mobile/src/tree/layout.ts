import type { NodeStatus } from '../api/types';

export type LayoutInput = { id: string; requires: string[]; status: NodeStatus };
export type PositionedNode = { id: string; depth: number; x: number; y: number };
export type Edge = { from: string; to: string; path: string; lit: boolean };

export type LayoutOptions = { minWidth: number; blockWidth: number; blockHeight: number; rowGap: number; colGap: number; padding: number };

/**
 * Layered layout for a prerequisite DAG:
 * - depth = longest prerequisite chain (roots at the top),
 * - nodes in a row are ordered by the mean x of their parents (barycenter) to reduce crossings,
 * - edges are orthogonal "circuit" paths: down from the parent, across at mid height, down into the child.
 * The backend guarantees the graph is acyclic; unknown references are ignored defensively.
 */
export function layoutTree(nodes: LayoutInput[], o: LayoutOptions) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) {
      return cached;
    }
    if (visiting.has(id)) {
      return 0; // cycle guard
    }
    visiting.add(id);
    const reqs = (byId.get(id)?.requires ?? []).filter(r => byId.has(r));
    const d = reqs.length ? 1 + Math.max(...reqs.map(depthOf)) : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  nodes.forEach(n => depthOf(n.id));

  const rows: LayoutInput[][] = [];
  nodes.forEach(n => (rows[depth.get(n.id)!] ??= []).push(n));
  const maxRow = Math.max(1, ...rows.map(r => r?.length ?? 0));
  const width = Math.max(o.minWidth, o.padding * 2 + maxRow * o.blockWidth + (maxRow - 1) * o.colGap);

  const centerX = new Map<string, number>();
  const positioned: PositionedNode[] = [];
  rows.forEach((row = [], d) => {
    const sorted = d === 0
      ? row
      : [...row].sort((a, b) => meanParentX(a) - meanParentX(b));
    const slot = (width - o.padding * 2) / sorted.length;
    sorted.forEach((n, i) => {
      const cx = o.padding + slot * i + slot / 2;
      centerX.set(n.id, cx);
      positioned.push({ id: n.id, depth: d, x: cx - o.blockWidth / 2, y: o.padding + d * (o.blockHeight + o.rowGap) });
    });
  });
  function meanParentX(n: LayoutInput) {
    const xs = n.requires.map(r => centerX.get(r)).filter((x): x is number => x !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  }

  const posById = new Map(positioned.map(p => [p.id, p]));
  const edges: Edge[] = [];
  for (const n of nodes) {
    const child = posById.get(n.id)!;
    for (const r of n.requires) {
      const parent = posById.get(r);
      if (!parent) {
        continue;
      }
      const px = centerX.get(r)!, cx = centerX.get(n.id)!;
      const y1 = parent.y + o.blockHeight + 2;
      const y2 = child.y - 6;
      const my = Math.round((y1 + y2) / 2);
      const lit = byId.get(r)!.status === 'COMPLETED' && n.status !== 'LOCKED';
      edges.push({ from: r, to: n.id, path: `M${px} ${y1} V${my} H${cx} V${y2}`, lit });
    }
  }
  const height = o.padding * 2 + rows.length * o.blockHeight + (rows.length - 1) * o.rowGap;
  return { nodes: positioned, edges, width, height };
}
