import { describe, expect, it } from 'vitest'

import type { TemplateContent } from './api/types'
import { slugify, validateTemplate } from './validation'

const base: TemplateContent = {
  title: 'Guitar',
  category: 'music',
  locale: 'en',
  nodes: [
    { id: 'chords', title: 'Chords', xp: 100, requires: [] },
    { id: 'strum', title: 'Strumming', xp: 150, requires: ['chords'] },
  ],
}

describe('validateTemplate', () => {
  it('accepts a valid tree', () => {
    expect(validateTemplate(base)).toEqual([])
  })

  it('reports duplicate ids and unknown prerequisites', () => {
    const t = { ...base, nodes: [...base.nodes, { id: 'chords', title: 'Again', xp: 10, requires: ['nope'] }] }
    const errors = validateTemplate(t)
    expect(errors).toContain('Duplicate skill id "chords"')
    expect(errors).toContain('Skill "chords" requires unknown skill "nope"')
  })

  it('detects cycles', () => {
    const t = { ...base, nodes: [{ id: 'a', title: 'A', xp: 1, requires: ['b'] }, { id: 'b', title: 'B', xp: 1, requires: ['a'] }] }
    expect(validateTemplate(t)).toEqual(['Skill prerequisites contain a cycle'])
  })

  it('rejects bad ids and XP', () => {
    const t = { ...base, nodes: [{ id: 'Bad Id', title: 'X', xp: -5, requires: [] }] }
    expect(validateTemplate(t)).toHaveLength(2)
  })
})

describe('slugify', () => {
  it('makes url-safe ids including Czech diacritics', () => {
    expect(slugify('Základní akordy!')).toBe('zakladni-akordy')
  })
})
