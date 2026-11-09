import { useState } from 'react'

import { useAuditLogs } from '../api/hooks'
import { Button, ErrorAlert, Loading, PageHeader } from '../ui'
import { timeAgo } from '../format'

export function AuditPage() {
  const [page, setPage] = useState(0)
  const logs = useAuditLogs(page)
  const rows = logs.data?.content ?? []
  return (
    <>
      <PageHeader overline="Security" title="Audit Log" />
      <ErrorAlert error={logs.error} />
      <div className="card table-card">
        {logs.isPending ? <Loading /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="caption" title={r.createdAt}>{timeAgo(r.createdAt)}</td>
                <td>{r.actorEmail ?? 'system'}</td>
                <td><span className="mono">{r.action}</span></td>
                <td className="caption">{r.targetType} {r.targetId}</td>
                <td className="mono caption" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.isPending && rows.length === 0 ? <div className="empty">No audit entries.</div> : null}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <Button small disabled={page === 0} onClick={() => setPage(p => p - 1)}>Newer</Button>
        <Button small disabled={rows.length < 50} onClick={() => setPage(p => p + 1)}>Older</Button>
      </div>
    </>
  )
}
