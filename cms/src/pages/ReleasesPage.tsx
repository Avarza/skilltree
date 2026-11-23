import { Eye, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { useConfigPreview, useConfigVersions, useRollback } from '../api/hooks'
import { canPublish, useAuth } from '../auth-context'
import { Button, ErrorAlert, Loading, PageHeader } from '../ui'
import { timeAgo } from '../format'

export function ReleasesPage() {
  const { session } = useAuth()
  const versions = useConfigVersions()
  const rollback = useRollback()
  const [showPreview, setShowPreview] = useState(false)
  const latest = versions.data?.[0]?.version

  return (
    <>
      <PageHeader overline="Delivery" title="Content Releases">
        <Button icon={Eye} onClick={() => setShowPreview(s => !s)}>
          {showPreview ? 'Hide preview' : 'Preview drafts'}
        </Button>
      </PageHeader>
      <p className="caption" style={{ marginBottom: 16, maxWidth: 720 }}>
        Every publish creates an immutable config snapshot. The apps download the newest one on launch and when they return to the foreground (ETag, so unchanged config costs one 304). Rollback re-publishes an older snapshot as a new version — no App Store release involved.
      </p>
      <ErrorAlert error={versions.error ?? rollback.error} />
      <div className={showPreview ? 'grid-2' : ''}>
        <div className="card table-card">
          {versions.isPending ? <Loading /> : null}
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Change</th>
                <th>Type</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(versions.data ?? []).map(v => (
                <tr key={v.version}>
                  <td>
                    <span className={`version-pill ${v.version === latest ? 'live' : ''}`}>v{v.version}</span>
                  </td>
                  <td>{v.note}</td>
                  <td className="caption" style={{ color: v.source === 'ROLLBACK' ? 'var(--warn)' : undefined }}>
                    {v.source.toLowerCase()}
                  </td>
                  <td className="caption">{timeAgo(v.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {v.version === latest ? (
                      <span className="overline" style={{ color: 'var(--ok)' }}>Live</span>
                    ) : canPublish(session?.role) ? (
                      <Button
                        variant="ghost"
                        small
                        icon={RotateCcw}
                        loading={rollback.isPending && rollback.variables?.version === v.version}
                        onClick={() => confirm(`Roll back the apps to the content of v${v.version}?`) && rollback.mutate({ version: v.version })}
                      >
                        Rollback
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showPreview ? <PreviewPanel /> : null}
      </div>
    </>
  )
}

function PreviewPanel() {
  const preview = useConfigPreview()
  return (
    <div className="card stack fade-in">
      <strong>Preview: all current drafts published</strong>
      <span className="caption">GET /api/v1/admin/config-versions/preview — not visible to the apps.</span>
      <ErrorAlert error={preview.error} />
      {preview.data ? <pre className="json">{JSON.stringify(preview.data, null, 2)}</pre> : <Loading />}
    </div>
  )
}
