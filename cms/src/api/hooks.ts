import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'
import type { AuditLog, ConfigVersion, Entry, EntryType, Page, PublishResponse, Revision } from './types'

const keys = {
  entries: (type?: EntryType) => ['entries', type ?? 'all'] as const,
  entry: (id: number) => ['entry', id] as const,
  revisions: (id: number) => ['revisions', id] as const,
  versions: ['config-versions'] as const,
  preview: ['config-preview'] as const,
  audit: (page: number) => ['audit', page] as const,
}

export function useEntries<C>(type?: EntryType) {
  return useQuery({
    queryKey: keys.entries(type),
    queryFn: () => api<Entry<C>[]>(`/api/v1/admin/entries${type ? `?type=${type}` : ''}`),
  })
}

export function useEntry<C>(id: number | undefined) {
  return useQuery({
    queryKey: keys.entry(id ?? -1),
    queryFn: () => api<Entry<C>>(`/api/v1/admin/entries/${id}`),
    enabled: id !== undefined,
  })
}

export function useRevisions<C>(id: number | undefined) {
  return useQuery({
    queryKey: keys.revisions(id ?? -1),
    queryFn: () => api<Revision<C>[]>(`/api/v1/admin/entries/${id}/revisions`),
    enabled: id !== undefined,
  })
}

/** After any entry change refresh lists, the entry, its revisions and the release history/preview. */
function useInvalidate() {
  const qc = useQueryClient()
  return (entry?: Entry) => {
    qc.invalidateQueries({ queryKey: ['entries'] })
    qc.invalidateQueries({ queryKey: keys.versions })
    qc.invalidateQueries({ queryKey: keys.preview })
    qc.invalidateQueries({ queryKey: ['audit'] })
    if (entry) {
      qc.setQueryData(keys.entry(entry.id), entry)
      qc.invalidateQueries({ queryKey: keys.revisions(entry.id) })
    }
  }
}

export function useCreateEntry<C>() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: { type: EntryType; slug: string; content: C; note?: string }) =>
      api<Entry<C>>('/api/v1/admin/entries', { method: 'POST', body }),
    onSuccess: e => invalidate(e as Entry),
  })
}

export function useUpdateEntry<C>(id: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: { content: C; note?: string }) => api<Entry<C>>(`/api/v1/admin/entries/${id}`, { method: 'PUT', body }),
    onSuccess: e => invalidate(e as Entry),
  })
}

type Action = 'submit' | 'publish' | 'reject' | 'archive'

export function useEntryAction(id: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ action, note }: { action: Action; note?: string }) => {
      const res = await api<Entry | PublishResponse>(`/api/v1/admin/entries/${id}/${action}`, {
        method: 'POST',
        body: action === 'submit' || action === 'archive' ? undefined : { note },
      })
      return 'entry' in res ? res : { entry: res, configVersion: null }
    },
    onSuccess: r => invalidate(r.entry),
  })
}

export function useRestoreRevision(id: number) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (revision: number) => api<Entry>(`/api/v1/admin/entries/${id}/revisions/${revision}/restore`, { method: 'POST' }),
    onSuccess: e => invalidate(e),
  })
}

export function useConfigVersions() {
  return useQuery({ queryKey: keys.versions, queryFn: () => api<ConfigVersion[]>('/api/v1/admin/config-versions') })
}

export function useConfigPreview() {
  return useQuery({ queryKey: keys.preview, queryFn: () => api<Record<string, unknown>>('/api/v1/admin/config-versions/preview') })
}

export function useRollback() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ version, note }: { version: number; note?: string }) =>
      api<ConfigVersion>(`/api/v1/admin/config-versions/${version}/rollback`, { method: 'POST', body: { note } }),
    onSuccess: () => invalidate(),
  })
}

export function useAuditLogs(page: number) {
  return useQuery({
    queryKey: keys.audit(page),
    queryFn: () => api<Page<AuditLog>>(`/api/v1/admin/audit-logs?page=${page}&size=50`),
  })
}
