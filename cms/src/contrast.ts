/** WCAG 2.x contrast ratio between two #RRGGBB colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function contrastVerdict(ratio: number) {
  if (ratio >= 4.5) return { level: 'ok' as const, text: `Contrast ${ratio.toFixed(1)}:1 — fine for all text` }
  if (ratio >= 3) return { level: 'warn' as const, text: `Contrast ${ratio.toFixed(1)}:1 — large text only` }
  return { level: 'bad' as const, text: `Contrast ${ratio.toFixed(1)}:1 — too low, text will be hard to read` }
}
