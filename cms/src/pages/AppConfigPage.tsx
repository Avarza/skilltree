import { useState } from 'react'

import { useEntries, useUpdateEntry } from '../api/hooks'
import type { AppConfigContent, Entry, ThemeContent } from '../api/types'
import { EntryWorkflow } from '../EntryWorkflow'
import { ErrorAlert, Field, Loading, PageHeader } from '../ui'

export function AppConfigPage() {
  const configs = useEntries<AppConfigContent>('APP_CONFIG')
  if (configs.isPending) return <Loading />
  if (configs.error) return <ErrorAlert error={configs.error} />
  const entry = configs.data?.[0]
  if (!entry) return <div className="empty">App configuration is missing.</div>
  return (
    <>
      <PageHeader overline="Configuration" title="App Config" />
      <ConfigEditor key={`${entry.id}-${entry.currentRevision}`} entry={entry} />
    </>
  )
}

function ConfigEditor({ entry }: { entry: Entry<AppConfigContent> }) {
  const themes = useEntries<ThemeContent>('THEME')
  const update = useUpdateEntry<AppConfigContent>(entry.id)
  const [draft, setDraft] = useState(entry.content)
  const dirty = JSON.stringify(draft) !== JSON.stringify(entry.content)
  const ai = draft.aiGeneration
  const prog = draft.progression
  const invalid =
    ai.dailyLimitPerUser < 0 || ai.dailyLimitPerUser > 100 || ai.maxNodes < 3 || ai.maxNodes > 60 ||
    prog.xpPerLevel < 50 || prog.xpPerLevel > 100000 || prog.defaultNodeXp < 1 || prog.defaultNodeXp > 1000 ||
    !/^[a-z]{2}$/.test(draft.defaultLocale)
  const publishedThemes = (themes.data ?? []).filter(t => t.publishedRevision && t.status !== 'ARCHIVED')

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <div className="card">
        <EntryWorkflow entry={entry} dirty={dirty} invalid={invalid} saving={update.isPending} onSave={() => update.mutate({ content: draft })} canArchive={false} />
        <div style={{ marginTop: 12 }}>
          <ErrorAlert error={update.error} />
        </div>
      </div>
      <div className="card stack">
        <h2 className="title">AI generation</h2>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={ai.enabled} onChange={e => setDraft(d => ({ ...d, aiGeneration: { ...d.aiGeneration, enabled: e.target.checked } }))} />
          <span>Allow users to generate skill trees with AI</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="Daily limit per user" hint="0–100">
            <input className="input" type="number" min={0} max={100} value={ai.dailyLimitPerUser} onChange={e => setDraft(d => ({ ...d, aiGeneration: { ...d.aiGeneration, dailyLimitPerUser: num(e.target.value) } }))} />
          </Field>
          <Field label="Max skills per tree" hint="3–60">
            <input className="input" type="number" min={3} max={60} value={ai.maxNodes} onChange={e => setDraft(d => ({ ...d, aiGeneration: { ...d.aiGeneration, maxNodes: num(e.target.value) } }))} />
          </Field>
        </div>
      </div>
      <div className="card stack">
        <h2 className="title">Progression & defaults</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Field label="XP per level" hint="50–100 000">
            <input className="input" type="number" value={prog.xpPerLevel} onChange={e => setDraft(d => ({ ...d, progression: { ...d.progression, xpPerLevel: num(e.target.value) } }))} />
          </Field>
          <Field label="Default skill XP" hint="1–1000">
            <input className="input" type="number" value={prog.defaultNodeXp} onChange={e => setDraft(d => ({ ...d, progression: { ...d.progression, defaultNodeXp: num(e.target.value) } }))} />
          </Field>
          <Field label="Default language" hint="2-letter code">
            <input className="input" maxLength={2} value={draft.defaultLocale} onChange={e => setDraft(d => ({ ...d, defaultLocale: e.target.value.toLowerCase() }))} />
          </Field>
          <Field label="Active theme" hint="Only published themes can be activated">
            <select className="input" value={draft.activeTheme} onChange={e => setDraft(d => ({ ...d, activeTheme: e.target.value }))}>
              {publishedThemes.map(t => (
                <option key={t.id} value={t.slug}>
                  {t.content.name} ({t.slug})
                </option>
              ))}
              {!publishedThemes.some(t => t.slug === draft.activeTheme) ? <option value={draft.activeTheme}>{draft.activeTheme}</option> : null}
            </select>
          </Field>
        </div>
        {invalid ? <div className="alert error">Some values are out of range.</div> : null}
      </div>
    </div>
  )
}
