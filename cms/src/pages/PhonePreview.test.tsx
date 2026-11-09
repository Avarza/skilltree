import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Palette } from '../api/types'
import { PhonePreview } from './ThemePage'

const palette: Palette = {
  primary: '#FF5722', onPrimary: '#FFFFFF', background: '#080C11', surface: '#10161D', textPrimary: '#EEF6F8',
  textSecondary: '#8C98A8', nodeCompleted: '#3BE3A4', nodeInProgress: '#FFC15C', nodeAvailable: '#22D3EE', nodeLocked: '#33404F',
}

describe('PhonePreview', () => {
  it('renders the draft palette and shape', () => {
    render(<PhonePreview palette={palette} shape={{ cardRadius: 20, nodeBorderWidth: 3, nodeShape: 'circle' }} />)
    expect(screen.getByTestId('phone-preview')).toHaveStyle({ background: '#080C11' })
    expect(screen.getByText('Continue learning')).toHaveStyle({ background: '#FF5722', color: '#FFFFFF' })
  })

  it('falls back to a neutral color while a hex value is being typed', () => {
    render(<PhonePreview palette={{ ...palette, primary: '#FF57' }} shape={{ cardRadius: 20, nodeBorderWidth: 3, nodeShape: 'circle' }} />)
    expect(screen.getByText('Continue learning')).toHaveStyle({ background: '#888888' })
  })
})
