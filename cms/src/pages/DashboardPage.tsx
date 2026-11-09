import { Layers, Palette, Rocket } from 'lucide-react'
import { Link } from 'react-router'

import { useConfigVersions, useEntries } from '../api/hooks'
import type { EntryStatus } from '../api/types'
import { canPublish, useAuth } from '../auth-context'
import { Loading, PageHeader, StatusBadge } from '../ui'
import { timeAgo } from '../format'

const PATH = { SKILL_TEMPLATE: (id: number) => `/templates/${id}`, THEME: () => '/theme', APP_CONFIG: () => '/config' }

export function DashboardPage() {
  const { session } = useAuth()
  const entries = useEntries()
  const versions = useConfigVersions()
  const list = entries.data ?? []
  const count = (s: EntryStatus) => list.filter(e => e.status === s).length
  const review = list.filter(e => e.status === 'IN_REVIEW')
  const live = versions.data?.[0]

  return (
    <>
      <PageHeader overline="Overview" title={`Hi ${session?.email.split('@')[0]}`} />
      {entries.isPending ? <Loading /> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'] as EntryStatus[]).map(s => (
          <div key={s} className="card tight col">
            <StatusBadge status={s} />
            <span className="display">{count(s)}</span>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card stack">
          <h2 className="title">Waiting for review</h2>
          {review.length === 0 ? <p className="caption">Nothing waiting — all clear.</p> : null}
          {review.map(e => (
            <Link key={e.id} to={PATH[e.type](e.id)} className="row" style={{ textDecoration: 'none', color: 'inherit', justifyContent: 'space-between' }}>
              <span>
                <strong>{e.slug}</strong> <span className="caption">· {e.type.replace('_', ' ').toLowerCase()} · r{e.currentRevision}</span>
              </span>
              <span className="caption">{canPublish(session?.role) ? 'Review →' : timeAgo(e.updatedAt)}</span>
            </Link>
          ))}
        </div>
        <div className="card stack">
          <h2 className="title">Live in the apps</h2>
          {live ? (
            <>
              <div className="row">
                <span className="version-pill live">v{live.version}</span>
                <span>{live.note}</span>
              </div>
              <span className="caption">{timeAgo(live.createdAt)} · {live.source.toLowerCase()}</span>
            </>
          ) : (
            <span className="caption">No release yet</span>
          )}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Link className="btn secondary small" to="/templates"><Layers size={15} /> Templates</Link>
            <Link className="btn secondary small" to="/theme"><Palette size={15} /> Theme</Link>
            <Link className="btn secondary small" to="/releases"><Rocket size={15} /> Releases</Link>
          </div>
        </div>
      </div>
    </>
  )
}
