import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useEntries } from '../api/hooks'
import type { TemplateContent } from '../api/types'
import { Button, ErrorAlert, Loading, PageHeader, StatusBadge } from '../ui'
import { timeAgo } from '../format'

export function TemplatesPage() {
  const navigate = useNavigate()
  const templates = useEntries<TemplateContent>('SKILL_TEMPLATE')
  return (
    <>
      <PageHeader overline="Content" title="Skill Templates">
        <Button variant="primary" icon={Plus} onClick={() => navigate('/templates/new')}>
          New template
        </Button>
      </PageHeader>
      <ErrorAlert error={templates.error} />
      {templates.isPending ? <Loading /> : null}
      {templates.data ? (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Category</th>
                <th>Skills</th>
                <th>Status</th>
                <th>Revision</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.data.map(t => (
                <tr key={t.id} className="click" onClick={() => navigate(`/templates/${t.id}`)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(`/templates/${t.id}`)}>
                  <td>
                    <div className="col" style={{ gap: 2 }}>
                      <strong>{t.content.title}</strong>
                      <span className="caption">{t.slug}</span>
                    </div>
                  </td>
                  <td>{t.content.category}</td>
                  <td>{t.content.nodes.length}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="caption">
                    r{t.currentRevision} · live {t.publishedRevision ? `r${t.publishedRevision}` : '—'}
                  </td>
                  <td className="caption">{timeAgo(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {templates.data.length === 0 ? <div className="empty">No templates yet.</div> : null}
        </div>
      ) : null}
    </>
  )
}
