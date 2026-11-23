import { describe, expect, it } from 'vitest'

import { contrastRatio, contrastVerdict } from './contrast'

describe('contrastRatio', () => {
  it('is 21 for black on white and symmetric', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0)
  })

  it('classifies WCAG levels', () => {
    expect(contrastVerdict(contrastRatio('#0E7490', '#FFFFFF')).level).toBe('ok')
    expect(contrastVerdict(contrastRatio('#22D3EE', '#FFFFFF')).level).toBe('bad')
  })
})
