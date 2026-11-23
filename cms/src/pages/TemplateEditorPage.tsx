import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useCreateEntry, useEntry, useUpdateEntry } from '../api/hooks'
import type { Entry, TemplateContent, TemplateNode } from '../api/types'
import { EntryWorkflow } from '../EntryWorkflow'
import { Button, ErrorAlert, Field, Loading, PageHeader } from '../ui'
import { SLUG, slugify, validateTemplate } from '../validation'

const EMPTY: TemplateContent = {
  title: '',
  description: '',
  category: '',
  icon: '',
  locale: 'en',
  nodes: [{ id: 'basics', title: 'Basics', description: '', xp: 100, requires: [] }],
}

export function TemplateEditorPage() {
  const { id } = useParams()
  const entryId = id === undefined ? undefined : Number(id)
  const entry = useEntry<TemplateContent>(entryId)
  if (entryId !== undefined && entry.isPending) return <Loading />
  if (entryId !== undefined && entry.error) return <ErrorAlert error={entry.error} />
  // Remount on a new revision (save, restore) so the form reloads from the server.
  return <TemplateForm key={entry.data ? `${entry.data.id}-${entry.data.currentRevision}` : 'new'} entry={entry.data} />
}

function TemplateForm({ entry: saved }: { entry?: Entry<TemplateContent> }) {
  const isNew = saved === undefined
  const entryId = saved?.id
  const entry = { data: saved }
  const navigate = useNavigate()
  const create = useCreateEntry<TemplateContent>()
  const update = useUpdateEntry<TemplateContent>(entryId ?? -1)

  const [draft, setDraft] = useState<TemplateContent>(() => (saved ? normalize(saved.content) : EMPTY))
  const [slug, setSlug] = useState('')
  const [note, setNote] = useState('')

  const errors = useMemo(() => validateTemplate(draft), [draft])
  const dirty = isNew || (entry.data ? JSON.stringify(normalize(entry.data.content)) !== JSON.stringify(draft) : false)
  const slugOk = !isNew || SLUG.test(slug)

  const save = () => {
    const content = clean(draft)
    if (isNew) {
      create.mutate({ type: 'SKILL_TEMPLATE', slug, content, note: note || undefined }, { onSuccess: e => navigate(`/templates/${e.id}`, { replace: true }) })
    } else {
      update.mutate({ content, note: note || undefined }, { onSuccess: () => setNote('') })
    }
  }

  const setNode = (i: number, patch: Partial<TemplateNode>) =>
    setDraft(d => ({ ...d, nodes: d.nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)) }))

  return (
    <>
      <Link to="/templates" className="caption row" style={{ textDecoration: 'none', marginBottom: 8 }}>
        <ArrowLeft size={14} /> Skill Templates
      </Link>
      <PageHeader overline={isNew ? 'New template' : `Template / ${entry.data?.slug}`} title={draft.title || 'Untitled template'} />

      <div className="stack">
        <div className="card stack">
          {entry.data ? (
            <EntryWorkflow entry={entry.data} dirty={dirty} invalid={errors.length > 0} saving={update.isPending} onSave={save} />
          ) : (
            <div className="row">
              <span style={{ flex: 1 }} className="caption">
                A new template starts as a draft. Submit it for review when it's ready.
              </span>
              <Button variant="primary" small onClick={save} loading={create.isPending} disabled={errors.length > 0 || !slugOk}>
                Create draft
              </Button>
            </div>
          )}
          <ErrorAlert error={create.error ?? update.error} />
        </div>

        <div className="card stack">
          <h2 className="title">Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Field label="Title">
              <input
                className="input"
                value={draft.title}
                maxLength={80}
                onChange={e => {
                  const title = e.target.value
                  setDraft(d => ({ ...d, title }))
                  if (isNew) setSlug(slugify(title, 80))
                }}
              />
            </Field>
            {isNew ? (
              <Field label="Slug" hint="URL id used by the apps; can't be changed later">
                <input className={`input ${slug && !slugOk ? 'invalid' : ''}`} value={slug} onChange={e => setSlug(e.target.value)} />
              </Field>
            ) : null}
            <Field label="Category">
              <input className="input" value={draft.category} maxLength={40} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} />
            </Field>
            <Field label="Icon" hint="code, music, languages, star…">
              <input className="input" value={draft.icon ?? ''} maxLength={40} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))} />
            </Field>
            <Field label="Language">
              <input className="input" value={draft.locale} maxLength={2} onChange={e => setDraft(d => ({ ...d, locale: e.target.value.toLowerCase() }))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" value={draft.description ?? ''} maxLength={500} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </Field>
        </div>

        <div className="card stack">
          <div className="row">
            <h2 className="title" style={{ flex: 1 }}>
              Skills <span className="caption">({draft.nodes.length})</span>
            </h2>
            <Button
              small
              icon={Plus}
              onClick={() => setDraft(d => ({ ...d, nodes: [...d.nodes, { id: `skill-${d.nodes.length + 1}`, title: '', description: '', xp: 100, requires: d.nodes.length ? [d.nodes[d.nodes.length - 1].id] : [] }] }))}
            >
              Add skill
            </Button>
          </div>
          <div className="node-row caption" style={{ fontWeight: 600 }}>
            <span>Id</span>
            <span>Title</span>
            <span>XP</span>
            <span>Requires (ids, comma separated)</span>
            <span />
          </div>
          {draft.nodes.map((n, i) => (
            <div key={i} className="col" style={{ gap: 6, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div className="node-row">
                <input className="input mono" value={n.id} onChange={e => setNode(i, { id: e.target.value })} aria-label="Skill id" />
                <input
                  className="input"
                  value={n.title}
                  placeholder="Skill name"
                  onChange={e => {
                    const title = e.target.value
                    const autoId = n.id.startsWith('skill-') || n.id === slugify(n.title)
                    setNode(i, { title, ...(autoId ? { id: slugify(title) || n.id } : {}) })
                  }}
                  aria-label="Skill title"
                />
                <input className="input" type="number" min={0} max={10000} value={n.xp} onChange={e => setNode(i, { xp: Number(e.target.value) })} aria-label="XP" />
                <input
                  className="input mono"
                  value={(n.requires ?? []).join(', ')}
                  onChange={e => setNode(i, { requires: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  aria-label="Requires"
                />
                <button className="icon-btn" title="Remove skill" aria-label="Remove skill" onClick={() => setDraft(d => ({ ...d, nodes: d.nodes.filter((_, j) => j !== i) }))}>
                  <Trash2 size={15} />
                </button>
              </div>
              <input className="input" placeholder="What to practise and how to know it's done" value={n.description ?? ''} maxLength={500} onChange={e => setNode(i, { description: e.target.value })} />
            </div>
          ))}
          {errors.length ? (
            <div className="alert error">
              <strong>Fix before saving:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {errors.map(e => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {!isNew ? (
            <Field label="Change note (optional)">
              <input className="input" value={note} maxLength={500} placeholder="e.g. Added capstone project" onChange={e => setNote(e.target.value)} />
            </Field>
          ) : null}
        </div>
      </div>
    </>
  )
}

function normalize(c: TemplateContent): TemplateContent {
  return {
    title: c.title ?? '',
    description: c.description ?? '',
    category: c.category ?? '',
    icon: c.icon ?? '',
    locale: c.locale ?? 'en',
    nodes: (c.nodes ?? []).map(n => ({ id: n.id, title: n.title, description: n.description ?? '', xp: n.xp, requires: n.requires ?? [] })),
  }
}

/** Empty optional strings are sent as null so the backend stores clean content. */
function clean(c: TemplateContent): TemplateContent {
  return {
    ...c,
    description: c.description?.trim() || null,
    icon: c.icon?.trim() || null,
    nodes: c.nodes.map(n => ({ ...n, description: n.description?.trim() || null })),
  }
}
