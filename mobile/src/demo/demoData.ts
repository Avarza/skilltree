import type { Practice, StudySession } from '../api/practice';
import type { NodeStatus, SkillTree, TreeNode } from '../api/types';

/** Stored form of a demo tree: LOCKED/AVAILABLE and the XP totals are derived on read, like on the server. */
export type DemoNode = Omit<TreeNode, 'status'> & { status: NodeStatus | null };
export type DemoTree = Omit<SkillTree, 'nodes' | 'earnedXp' | 'totalXp' | 'level' | 'completedNodes'> & {
  nodes: DemoNode[];
};
export type DemoState = { version: 1; trees: DemoTree[]; sessions: StudySession[]; nextSessionId: number };

const n = (
  id: string,
  title: string,
  xp: number,
  requires: string[],
  description: string,
  status: NodeStatus | null = null,
): DemoNode => ({ id, title, xp, requires, description, status });

const daysAgo = (days: number, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  // "Today" must not end up in the future when the demo starts in the morning.
  const latest = Date.now() - 30 * 60 * 1000;
  return new Date(Math.min(d.getTime(), Math.max(latest, new Date().setHours(0, 5, 0, 0)))).toISOString();
};

export function seedState(): DemoState {
  const created = daysAgo(12);
  const trees: DemoTree[] = [
    {
      id: 'demo-typescript',
      title: 'Learn TypeScript',
      description: 'From first types to confidently typing real-world apps.',
      source: 'TEMPLATE',
      templateSlug: 'learn-typescript',
      createdAt: created,
      updatedAt: daysAgo(0),
      nodes: [
        n('ts-setup', 'Set up TypeScript', 50, [], 'Install tsc, create tsconfig.json and compile your first file.', 'COMPLETED'),
        n('basic-types', 'Basic types', 100, ['ts-setup'], 'Use string, number, boolean, arrays and tuples with annotations.', 'COMPLETED'),
        n('functions', 'Typed functions', 100, ['basic-types'], 'Type parameters, return values, optional and default params.', 'COMPLETED'),
        n('interfaces', 'Interfaces & type aliases', 150, ['basic-types'], 'Model objects with interfaces and type aliases; know when to use which.', 'IN_PROGRESS'),
        n('unions', 'Unions & narrowing', 200, ['interfaces'], 'Combine types with unions and narrow them with typeof, in and discriminants.'),
        n('generics', 'Generics', 250, ['functions', 'interfaces'], 'Write reusable generic functions and types with constraints.'),
        n('utility-types', 'Utility types', 150, ['generics'], 'Use Partial, Pick, Omit, Record and ReturnType in real code.'),
        n('async', 'Typing async code', 200, ['functions', 'unions'], 'Type Promises, async functions and API responses safely.'),
        n('react-ts', 'TypeScript with React', 300, ['generics', 'async'], 'Type props, state, events and hooks in a React component.'),
        n('capstone', 'Capstone: typed app', 600, ['react-ts', 'utility-types'], 'Build a small app with strict mode on and zero any.'),
      ],
    },
    {
      id: 'demo-spanish',
      title: 'Spanish A1',
      description: 'Survive your first trip: greetings, numbers, food and simple conversations.',
      source: 'AI',
      createdAt: daysAgo(9),
      updatedAt: daysAgo(1),
      nodes: [
        n('greetings', 'Greetings & introductions', 80, [], 'Say hello, introduce yourself and ask how someone is.', 'COMPLETED'),
        n('numbers', 'Numbers 0–100', 80, [], 'Count, tell prices and give your phone number.', 'COMPLETED'),
        n('present', 'Present tense', 150, ['greetings'], 'Conjugate regular -ar, -er and -ir verbs plus ser and estar.', 'IN_PROGRESS'),
        n('food', 'Food & drinks', 100, ['numbers'], 'Name common dishes and drinks and understand a simple menu.'),
        n('ordering', 'Ordering at a café', 120, ['food', 'present'], 'Order, ask for the bill and handle small talk with a waiter.'),
        n('directions', 'Asking for directions', 120, ['present'], 'Ask where things are and follow simple directions.'),
        n('conversation', 'First conversation', 250, ['ordering', 'directions'], 'Hold a five-minute conversation about yourself and your plans.'),
      ],
    },
    {
      id: 'demo-guitar',
      title: 'Acoustic guitar basics',
      description: 'Play your first songs with open chords and steady strumming.',
      source: 'AI',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
      nodes: [
        n('tuning', 'Tuning & posture', 50, [], 'Tune by ear or app and hold the guitar without tension.', 'COMPLETED'),
        n('open-chords', 'Open chords', 150, ['tuning'], 'Play clean E, A, D, G and C major plus A and E minor.', 'IN_PROGRESS'),
        n('strumming', 'Strumming patterns', 120, ['tuning'], 'Keep time with down-up patterns and a metronome.'),
        n('changes', 'Chord changes', 150, ['open-chords', 'strumming'], 'Switch between chords on the beat without stopping.'),
        n('first-song', 'Your first song', 200, ['changes'], 'Play a full song with four chords from start to finish.'),
        n('barre', 'Barre chords', 300, ['first-song'], 'Play F and B minor with a full barre.'),
      ],
    },
  ];

  // A week of focus-timer sessions so the Progress chart and streak have something to show.
  const plan: [string, string, number, number][] = [
    ['demo-typescript', 'interfaces', 0, 25],
    ['demo-spanish', 'present', 1, 20],
    ['demo-typescript', 'functions', 2, 40],
    ['demo-guitar', 'open-chords', 2, 15],
    ['demo-spanish', 'numbers', 3, 30],
    ['demo-typescript', 'basic-types', 4, 35],
    ['demo-guitar', 'tuning', 5, 20],
    ['demo-spanish', 'greetings', 8, 25],
  ];
  const sessions: StudySession[] = plan.map(([treeId, nodeId, ago, minutes], i) => ({
    id: i + 1,
    treeId,
    nodeId,
    durationSeconds: minutes * 60,
    endedAt: daysAgo(ago, 19 - (i % 3)),
  }));

  return { version: 1, trees, sessions, nextSessionId: sessions.length + 1 };
}

/** Completions for the local activity log, matching the COMPLETED nodes above. */
export const seedCompletions = () => [
  { treeId: 'demo-spanish', nodeId: 'greetings', xp: 80, at: daysAgo(8) },
  { treeId: 'demo-typescript', nodeId: 'ts-setup', xp: 50, at: daysAgo(6) },
  { treeId: 'demo-guitar', nodeId: 'tuning', xp: 50, at: daysAgo(5) },
  { treeId: 'demo-typescript', nodeId: 'basic-types', xp: 100, at: daysAgo(4) },
  { treeId: 'demo-spanish', nodeId: 'numbers', xp: 80, at: daysAgo(3) },
  { treeId: 'demo-typescript', nodeId: 'functions', xp: 100, at: daysAgo(2) },
];

/** Hand-written practice for a few skills; everything else gets {@link genericPractice}. */
export const PRACTICE: Record<string, Practice> = {
  interfaces: {
    lesson:
      'An interface describes the shape of an object: which properties it has and their types. A type alias gives a name to any type, including unions and tuples. Use interfaces for object shapes you expect to extend (they can be merged and extended with `extends`), and type aliases for unions, function types and anything that is not a plain object.',
    tasks: [
      'Model a `User` with id, email and an optional displayName as an interface',
      'Extend it into `Admin` that adds a `permissions: string[]` field',
      'Write `type Status = "active" | "banned"` and add it to `User`',
      'Rewrite one of your interfaces as a type alias and note what changed',
    ],
    quiz: [
      {
        question: 'Which can describe a union like "a" | "b"?',
        options: ['Only an interface', 'Only a type alias', 'Both', 'Neither'],
        correctIndex: 1,
        explanation: 'Interfaces only describe object shapes; unions need a type alias.',
      },
      {
        question: 'How does an interface add fields from another interface?',
        options: ['implements', 'extends', 'with', 'merge'],
        correctIndex: 1,
        explanation: '`interface Admin extends User { … }` copies User’s fields and adds new ones.',
      },
      {
        question: 'What does `displayName?: string` mean?',
        options: ['It can be null only', 'It is optional', 'It is read-only', 'It must be a non-empty string'],
        correctIndex: 1,
        explanation: 'The `?` marks the property as optional, so its type is string | undefined.',
      },
    ],
    suggestedMinutes: 30,
  },
  present: {
    lesson:
      'Regular verbs drop -ar, -er or -ir and add an ending for the person: hablar → hablo, hablas, habla, hablamos, habláis, hablan. -er and -ir verbs use -o, -es, -e … Ser is for identity and origin (soy de Praga), estar for location and states (estoy cansado).',
    tasks: [
      'Conjugate hablar, comer and vivir for all six persons out loud',
      'Write five sentences about yourself using ser and estar',
      'Describe your morning routine in three present-tense sentences',
    ],
    quiz: [
      {
        question: '“We eat” in Spanish is…',
        options: ['comemos', 'comimos', 'coméis', 'comen'],
        correctIndex: 0,
      },
      {
        question: 'Which verb fits: “___ en casa” (I am at home)?',
        options: ['Soy', 'Estoy', 'Tengo', 'Hay'],
        correctIndex: 1,
        explanation: 'Location uses estar.',
      },
    ],
    suggestedMinutes: 20,
  },
  'open-chords': {
    lesson:
      'Open chords use open strings plus a few fretted notes. Press just behind the fret with your fingertips, keep your thumb behind the neck and let every string ring. Start with E minor and A minor (two and three fingers), then add E, A, D, G and C.',
    tasks: [
      'Play each chord and pick the strings one by one; fix any muted note',
      'Hold each shape for 4 beats, release, and place it again 10 times',
      'Switch Em ↔ Am for two minutes with a metronome at 60 bpm',
    ],
    quiz: [
      {
        question: 'Where should your fingertip press the string?',
        options: ['On top of the fret', 'Just behind the fret', 'In the middle between frets', 'Anywhere'],
        correctIndex: 1,
      },
    ],
    suggestedMinutes: 15,
  },
};

export function genericPractice(tree: DemoTree, node: DemoNode): Practice {
  const minutes = Math.max(10, Math.min(60, Math.round((node.xp * 0.6) / 5) * 5));
  const before = node.requires
    .map(r => tree.nodes.find(x => x.id === r)?.title)
    .filter((t): t is string => !!t);
  const unlocks = tree.nodes.filter(x => x.requires.includes(node.id)).map(x => x.title);
  const others = tree.nodes.filter(x => x.id !== node.id && !node.requires.includes(x.id)).map(x => x.title);
  const quiz =
    before.length > 0 && others.length >= 2
      ? [
          {
            question: `Which skill do you need before “${node.title}”?`,
            options: [before[0], others[0], others[1]].sort(),
            correctIndex: [before[0], others[0], others[1]].sort().indexOf(before[0]),
            explanation: `${node.title} builds on ${before.join(' and ')}.`,
          },
        ]
      : [];
  return {
    lesson: `${node.description ?? `Focus on ${node.title}.`}${
      unlocks.length ? ` Finishing it unlocks ${unlocks.join(', ')}.` : ''
    }`,
    tasks: [
      `Read or watch one good resource about ${node.title}`,
      `Practise it hands-on for at least ${Math.max(5, minutes / 2)} minutes`,
      'Write down in one sentence what you can do now that you couldn’t before',
    ],
    quiz,
    suggestedMinutes: minutes,
  };
}

/** Offline stand-in for the Claude generator: a small tree shaped around the topic. */
export function generatedTree(topic: string, level: string, goal?: string): DemoTree {
  const t = topic.trim();
  const now = new Date().toISOString();
  const base = level === 'advanced' ? 150 : level === 'intermediate' ? 120 : 80;
  return {
    id: `demo-${Date.now().toString(36)}`,
    title: t.charAt(0).toUpperCase() + t.slice(1),
    description: goal?.trim() || `A ${level} path for ${t}. (Demo: generated offline, not by Claude.)`,
    source: 'AI',
    createdAt: now,
    updatedAt: now,
    nodes: [
      n('foundations', `${t}: foundations`, base, [], `Learn the core vocabulary and the big picture of ${t}.`),
      n('tools', 'Tools & setup', base, [], `Get the tools, materials or resources you need for ${t}.`),
      n('core', 'Core techniques', base + 40, ['foundations'], `Practise the fundamental techniques of ${t} until they feel natural.`),
      n('practice', 'Guided practice', base + 40, ['core', 'tools'], `Follow a guided exercise or tutorial in ${t} from start to finish.`),
      n('patterns', 'Common patterns', base + 80, ['core'], `Recognise the patterns experienced people use in ${t}.`),
      n('project', 'Mini project', base * 2, ['practice', 'patterns'], `Apply what you learned to a small real project in ${t}.`),
      n('next', 'Next level', base * 2 + 50, ['project'], `Pick an advanced area of ${t} and set your next goal.`),
    ],
  };
}
