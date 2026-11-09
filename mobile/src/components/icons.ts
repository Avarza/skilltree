import {
  BookOpen,
  Camera,
  ChefHat,
  Code,
  Coins,
  Dumbbell,
  Languages,
  Leaf,
  Music,
  Palette,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react-native';

import type { SkillTree } from '../api/types';

const RULES: [RegExp, LucideIcon][] = [
  [/guitar|piano|music|sing|drum|chord/i, Music],
  [/code|typescript|javascript|python|java|program|react|web|data/i, Code],
  [/spanish|english|german|french|language|czech|japanese/i, Languages],
  [/cook|bake|chef|food/i, ChefHat],
  [/fit|gym|run|yoga|strength/i, Dumbbell],
  [/photo|camera/i, Camera],
  [/financ|money|invest|budget/i, Coins],
  [/medit|mindful|calm/i, Leaf],
  [/draw|paint|design|art/i, Palette],
  [/read|book|write|writing/i, BookOpen],
];

const ICON_KEYS: Record<string, LucideIcon> = { code: Code, music: Music, languages: Languages, star: Star, sparkles: Sparkles };

/** Category colors used on the Skill Map (decorative, not CMS-controlled). */
export const CATEGORY_COLORS = ['#22D3EE', '#60A5FA', '#34D399', '#FF7A8A', '#FFC15C', '#F472B6', '#A3E635', '#38BDF8'];

export function iconForTree(tree: Pick<SkillTree, 'title' | 'source'> & { icon?: string | null }): LucideIcon {
  if (tree.icon && ICON_KEYS[tree.icon]) {
    return ICON_KEYS[tree.icon];
  }
  for (const [re, icon] of RULES) {
    if (re.test(tree.title)) {
      return icon;
    }
  }
  return tree.source === 'AI' ? Sparkles : Star;
}
