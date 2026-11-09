import { Archive, Check, History, RotateCcw, Rocket, Save, Send, X } from 'lucide-react'
import { useState } from 'react'

import { useEntryAction, useRestoreRevision, useRevisions } from './api/hooks'
import type { Entry } from './api/types'
import { canPublish, useAuth } from './auth-context'
import { Button, ErrorAlert, StatusBadge } from './ui'
import { timeAgo } from './format'

/**
 * Workflow bar shared by all editors: Draft → In review → Published (→ Archived).
 * Saving is done by the editor (onSave); this bar handles submit / publish / reject / archive and history.
 */
export function EntryWorkflow({
  entry,
  dirty,
  saving,
  onSave,
  invalid = false,
  canArchive = true,
}: {
  entry: Entry
  dirty: boolean
  saving: boolean
  onSave: () => void
  /** Client-side validation failed: saving is blocked until it's fixed. */
  invalid?: boolean
  canArchive?: boolean
}) {
  const { session } = useAuth()
  const action = useEntryAction(entry.id)
  const [showHistory, setShowHistory] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const publisher = canPublish(session?.role)
  const run = (a: 'submit' | 'publish' | 'reject' | 'archive') => {
    setMessage(null)
    action.mutate(
      { action: a },
      {
        onSuccess: r => {
          if (a === 'publish') setMessage(r.configVersion ? `Published — the apps get config v${r.configVersion} on next launch.` : 'Published (no content change for the apps).')
          if (a === 'archive') setMessage('Archived.')
        },
      },
    )
  }

  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <StatusBadge status={entry.status} />
        <span className="caption">
          Revision {entry.currentRevision}
          {entry.publishedRevision ? ` · live: r${entry.publishedRevision}` : ' · not live yet'} · updated {timeAgo(entry.updatedAt)}
        </span>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" small icon={History} onClick={() => setShowHistory(s => !s)}>
          History
        </Button>
        {entry.status !== 'ARCHIVED' ? (
          <Button variant={dirty ? 'primary' : 'secondary'} small icon={Save} onClick={onSave} disabled={!dirty || invalid} loading={saving}>
            Save draft
          </Button>
        ) : null}
        {entry.status === 'DRAFT' ? (
          <Button small icon={Send} onClick={() => run('submit')} disabled={dirty} loading={action.isPending} title={dirty ? 'Save your changes first' : undefined}>
            Submit for review
          </Button>
        ) : null}
        {entry.status === 'IN_REVIEW' && publisher ? (
          <>
            <Button variant="ghost" small icon={X} onClick={() => run('reject')} loading={action.isPending}>
              Reject
            </Button>
            <Button variant="primary" small icon={Rocket} onClick={() => run('publish')} loading={action.isPending}>
              Publish
            </Button>
          </>
        ) : null}
        {entry.status === 'IN_REVIEW' && !publisher ? <span className="caption">Waiting for a publisher</span> : null}
        {canArchive && publisher && entry.status !== 'ARCHIVED' ? (
          <Button variant="danger" small icon={Archive} onClick={() => confirm('Archive this item? Live content will be removed from the apps.') && run('archive')}>
            Archive
          </Button>
        ) : null}
      </div>
      <ErrorAlert error={action.error} />
      {message ? (
        <div className="alert ok fade-in">
          <Check size={14} style={{ verticalAlign: -2 }} /> {message}
        </div>
      ) : null}
      {showHistory ? <RevisionHistory entry={entry} /> : null}
    </div>
  )
}

function RevisionHistory({ entry }: { entry: Entry }) {
  const revisions = useRevisions(entry.id)
  const restore = useRestoreRevision(entry.id)
  return (
    <div className="card tight fade-in">
      <strong>Revisions</strong>
      <div style={{ marginTop: 8 }}>
        {(revisions.data ?? []).map(r => (
          <div key={r.revision} className="revision">
            <span className={`version-pill ${r.revision === entry.publishedRevision ? 'live' : ''}`}>r{r.revision}</span>
            <div className="col" style={{ gap: 0, flex: 1 }}>
              <span>{r.note || 'Edited'}</span>
              <span className="caption">{timeAgo(r.createdAt)}</span>
            </div>
            {r.revision !== entry.currentRevision && entry.status !== 'ARCHIVED' ? (
              <Button variant="ghost" small icon={RotateCcw} onClick={() => restore.mutate(r.revision)} loading={restore.isPending && restore.variables === r.revision}>
                Restore as draft
              </Button>
            ) : (
              <span className="caption">current</span>
            )}
          </div>
        ))}
      </div>
      <ErrorAlert error={restore.error} />
    </div>
  )
}
