import type { TemplateContent } from './api/types'

export const HEX = /^#[0-9A-Fa-f]{6}$/
export const NODE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/
export const SLUG = /^[a-z0-9][a-z0-9-]{1,79}$/

/**
 * Client-side mirror of the backend template rules (ContentModels + TreeGraph) for instant feedback.
 * The server stays the source of truth and validates again on save.
 */
export function validateTemplate(t: TemplateContent): string[] {
  const errors: string[] = []
  if (!t.title.trim()) errors.push('Title is required')
  if (!t.category.trim()) errors.push('Category is required')
  if (!/^[a-z]{2}$/.test(t.locale)) errors.push('Locale must be a 2-letter code, e.g. "en"')
  if (t.nodes.length === 0) errors.push('Add at least one skill')
  if (t.nodes.length > 100) errors.push('A template can have at most 100 skills')

  const ids = new Set<string>()
  t.nodes.forEach((n, i) => {
    const label = n.title || `#${i + 1}`
    if (!NODE_ID.test(n.id)) errors.push(`Skill "${label}": id must be lowercase letters, digits and dashes`)
    if (ids.has(n.id)) errors.push(`Duplicate skill id "${n.id}"`)
    ids.add(n.id)
    if (!n.title.trim()) errors.push(`Skill #${i + 1}: title is required`)
    if (!Number.isInteger(n.xp) || n.xp < 0 || n.xp > 10000) errors.push(`Skill "${label}": XP must be 0–10000`)
  })
  for (const n of t.nodes) {
    for (const r of n.requires ?? []) {
      if (r === n.id) errors.push(`Skill "${n.id}" cannot require itself`)
      else if (!ids.has(r)) errors.push(`Skill "${n.id}" requires unknown skill "${r}"`)
    }
  }
  if (errors.length === 0 && hasCycle(t)) errors.push('Skill prerequisites contain a cycle')
  return errors
}

function hasCycle(t: TemplateContent) {
  const graph = new Map(t.nodes.map(n => [n.id, n.requires ?? []]))
  const done = new Set<string>()
  const path = new Set<string>()
  const visit = (id: string): boolean => {
    if (done.has(id)) return false
    if (path.has(id)) return true
    path.add(id)
    for (const r of graph.get(id) ?? []) if (visit(r)) return true
    path.delete(id)
    done.add(id)
    return false
  }
  return [...graph.keys()].some(visit)
}

/** "Basic Chords!" → "basic-chords" */
export function slugify(s: string, max = 40) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
}
