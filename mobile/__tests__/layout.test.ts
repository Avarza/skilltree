import { layoutTree, type LayoutInput } from '../src/tree/layout';

const opts = { minWidth: 360, blockWidth: 104, blockHeight: 112, rowGap: 40, colGap: 12, padding: 16 };

describe('layoutTree', () => {
  const nodes: LayoutInput[] = [
    { id: 'root', requires: [], status: 'COMPLETED' },
    { id: 'a', requires: ['root'], status: 'AVAILABLE' },
    { id: 'b', requires: ['root'], status: 'LOCKED' },
    { id: 'c', requires: ['a', 'b'], status: 'LOCKED' },
  ];

  it('places nodes in rows by longest prerequisite chain', () => {
    const { nodes: pos } = layoutTree(nodes, opts);
    const depth = Object.fromEntries(pos.map(p => [p.id, p.depth]));
    expect(depth).toEqual({ root: 0, a: 1, b: 1, c: 2 });
  });

  it('lights only edges from completed parents into unlocked children', () => {
    const { edges } = layoutTree(nodes, opts);
    const lit = edges.filter(e => e.lit).map(e => `${e.from}->${e.to}`);
    expect(lit).toEqual(['root->a']);
  });

  it('grows wider than the screen when a row does not fit', () => {
    const wide = Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, requires: [], status: 'AVAILABLE' as const }));
    expect(layoutTree(wide, opts).width).toBeGreaterThan(opts.minWidth);
  });

  it('ignores unknown prerequisites instead of crashing', () => {
    const { edges, nodes: pos } = layoutTree([{ id: 'x', requires: ['missing'], status: 'AVAILABLE' }], opts);
    expect(edges).toHaveLength(0);
    expect(pos[0].depth).toBe(0);
  });
});
