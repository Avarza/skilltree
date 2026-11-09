import { Check, Lock, Play, Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useEntries, useUpdateEntry } from '../api/hooks'
import { PALETTE_KEYS, type AppConfigContent, type Entry, type Palette, type ThemeContent } from '../api/types'
import { contrastRatio, contrastVerdict } from '../contrast'
import { EntryWorkflow } from '../EntryWorkflow'
import { ErrorAlert, Field, Loading, PageHeader, Segmented } from '../ui'
import { HEX } from '../validation'

type Scheme = 'light' | 'dark'

export function ThemePage() {
  const themes = useEntries<ThemeContent>('THEME')
  const configs = useEntries<AppConfigContent>('APP_CONFIG')
  const activeSlug = configs.data?.[0]?.content.activeTheme
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [scheme, setScheme] = useState<Scheme>('dark')
  const list = themes.data ?? []
  const entry = list.find(t => t.id === selectedId) ?? list.find(t => t.slug === activeSlug) ?? list[0]

  if (themes.isPending) return <Loading />
  if (themes.error) return <ErrorAlert error={themes.error} />
  if (!entry) return <div className="empty">No themes found.</div>

  return (
    <>
      <PageHeader overline={`Theme Manager / ${entry.slug}${entry.slug === activeSlug ? ' · active in the apps' : ''}`} title={entry.content.name}>
        {list.length > 1 ? (
          <select className="input" style={{ width: 220 }} value={entry.id} onChange={e => setSelectedId(Number(e.target.value))} aria-label="Theme">
            {list.map(t => (
              <option key={t.id} value={t.id}>
                {t.content.name} ({t.slug})
              </option>
            ))}
          </select>
        ) : null}
      </PageHeader>
      {/* Remount on a new revision (save, restore, publish) so the draft reloads from the server. */}
      <ThemeEditor key={`${entry.id}-${entry.currentRevision}`} entry={entry} isActive={entry.slug === activeSlug} scheme={scheme} onScheme={setScheme} />
    </>
  )
}

function ThemeEditor({ entry, isActive, scheme, onScheme }: { entry: Entry<ThemeContent>; isActive: boolean; scheme: Scheme; onScheme: (s: Scheme) => void }) {
  const update = useUpdateEntry<ThemeContent>(entry.id)
  const [draft, setDraft] = useState<ThemeContent>(entry.content)
  const [note, setNote] = useState('')

  const palette = draft[scheme]
  const saved = entry.content[scheme]
  const dirty = JSON.stringify(draft) !== JSON.stringify(entry.content)
  const invalid = useMemo(
    () => (['light', 'dark'] as Scheme[]).some(s => PALETTE_KEYS.some(k => !HEX.test(draft[s][k]))) || draft.shape.cardRadius < 0 || draft.shape.cardRadius > 32 || draft.shape.nodeBorderWidth < 0 || draft.shape.nodeBorderWidth > 4,
    [draft],
  )
  const verdict = HEX.test(palette.primary) && HEX.test(palette.onPrimary) ? contrastVerdict(contrastRatio(palette.primary, palette.onPrimary)) : null

  const setColor = (key: keyof Palette, value: string) => setDraft(d => ({ ...d, [scheme]: { ...d[scheme], [key]: value.toUpperCase() } }))
  const save = () => update.mutate({ content: draft, note: note || undefined }, { onSuccess: () => setNote('') })

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card">
          <EntryWorkflow entry={entry} dirty={dirty} invalid={invalid} saving={update.isPending} onSave={save} canArchive={!isActive} />
          <div style={{ marginTop: 12 }}>
            <ErrorAlert error={update.error} />
          </div>
        </div>
        <div className="card stack">
          <div className="row">
            <h2 className="title" style={{ flex: 1 }}>
              Colors
            </h2>
            <Segmented<Scheme>
              value={scheme}
              onChange={onScheme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <div className="swatch-grid">
            {PALETTE_KEYS.map(k => {
              const v = palette[k]
              const ok = HEX.test(v)
              const changed = v.toUpperCase() !== saved[k].toUpperCase()
              return (
                <div key={k} className="field">
                  <span style={{ color: changed ? 'var(--warn)' : undefined }}>
                    {k}
                    {changed ? ' · changed' : ''}
                  </span>
                  <div className={`color-field ${changed ? 'changed' : ''}`} style={!ok ? { borderColor: 'var(--danger)' } : undefined}>
                    <input type="color" value={ok ? v : '#000000'} onChange={e => setColor(k, e.target.value)} aria-label={`${k} color picker`} />
                    <input type="text" value={v} maxLength={7} onChange={e => setColor(k, e.target.value)} aria-label={`${k} hex`} />
                  </div>
                </div>
              )
            })}
          </div>
          {verdict ? <div className={`alert ${verdict.level === 'ok' ? 'ok' : 'error'}`}>primary / onPrimary — {verdict.text}</div> : null}
        </div>
        <div className="card stack">
          <h2 className="title">Shape</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Field label="Card radius" hint="0–32 px">
              <input className="input" type="number" min={0} max={32} value={draft.shape.cardRadius} onChange={e => setDraft(d => ({ ...d, shape: { ...d.shape, cardRadius: Number(e.target.value) } }))} />
            </Field>
            <Field label="Node border width" hint="0–4 px">
              <input className="input" type="number" min={0} max={4} value={draft.shape.nodeBorderWidth} onChange={e => setDraft(d => ({ ...d, shape: { ...d.shape, nodeBorderWidth: Number(e.target.value) } }))} />
            </Field>
            <Field label="Node shape">
              <select className="input" value={draft.shape.nodeShape} onChange={e => setDraft(d => ({ ...d, shape: { ...d.shape, nodeShape: e.target.value as ThemeContent['shape']['nodeShape'] } }))}>
                <option value="circle">circle</option>
                <option value="rounded">rounded</option>
                <option value="hexagon">hexagon</option>
              </select>
            </Field>
          </div>
          <Field label="Change note (optional)">
            <input className="input" value={note} maxLength={500} placeholder="e.g. Autumn campaign colors" onChange={e => setNote(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="col" style={{ position: 'sticky', top: 24, alignItems: 'center', gap: 10 }}>
        <div className="row" style={{ width: 320, justifyContent: 'space-between' }}>
          <span className="overline">Live preview · {scheme}</span>
          {dirty ? <span className="caption" style={{ color: 'var(--warn)' }}>unsaved</span> : null}
        </div>
        <PhonePreview palette={palette} shape={draft.shape} />
        <span className="hint">What the app shows after this theme is published.</span>
      </div>
    </div>
  )
}

const safe = (c: string, fallback = '#888888') => (HEX.test(c) ? c : fallback)

/** Mirrors the mobile Home screen with the draft palette, so editors see the effect before publishing. */
export function PhonePreview({ palette: p, shape }: { palette: Palette; shape: ThemeContent['shape'] }) {
  const radius = shape.nodeShape === 'circle' ? '50%' : shape.nodeShape === 'rounded' ? '16px' : '30%'
  const nodes: [string, string, typeof Check, string][] = [
    ['Basic Chords', safe(p.nodeCompleted), Check, '+100 XP'],
    ['Power Chords', safe(p.nodeInProgress), Play, '150 XP'],
    ['Strumming', safe(p.nodeAvailable), Star, '120 XP'],
    ['Barre Chords', safe(p.nodeLocked), Lock, '250 XP'],
  ]
  return (
    <div className="phone" style={{ background: safe(p.background), color: safe(p.textPrimary) }} data-testid="phone-preview">
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: safe(p.textSecondary) }}>LEVEL 4 · 650 XP</span>
      <strong style={{ fontSize: 24 }}>My Skills</strong>
      <div className="phone-card" style={{ background: safe(p.surface), borderRadius: shape.cardRadius }}>
        <div className="phone-tile" style={{ background: `${safe(p.primary)}22` }}>
          <Star size={20} color={safe(p.primary)} />
        </div>
        <div className="col" style={{ gap: 4, flex: 1 }}>
          <strong style={{ fontSize: 15 }}>Guitar Mastery</strong>
          <span style={{ fontSize: 12, color: safe(p.textSecondary) }}>Level 4 · 650 / 1 000 XP</span>
          <div className="phone-bar" style={{ background: `${safe(p.textSecondary)}33` }}>
            <div style={{ width: '65%', height: '100%', background: safe(p.primary) }} />
          </div>
        </div>
      </div>
      <div className="phone-nodes">
        {nodes.map(([title, color, Icon, xp]) => (
          <div key={title} className="phone-node">
            <div className="phone-circle" style={{ borderRadius: radius, border: `${shape.nodeBorderWidth}px solid ${color}`, background: `${color}22`, boxShadow: color === safe(p.nodeLocked) ? 'none' : `0 0 14px ${color}88` }}>
              <Icon size={20} color={color} />
            </div>
            <span>{title}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: safe(p.textSecondary) }}>{xp}</span>
          </div>
        ))}
      </div>
      <div className="phone-btn" style={{ background: safe(p.primary), color: safe(p.onPrimary) }}>
        Continue learning
      </div>
    </div>
  )
}
