import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { errorText } from './api/client'
import type { EntryStatus } from './api/types'

export function Button({
  variant = 'secondary',
  small,
  icon: Icon,
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  small?: boolean
  icon?: LucideIcon
  loading?: boolean
}) {
  return (
    <button className={`btn ${variant} ${small ? 'small' : ''} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" /> : Icon ? <Icon size={small ? 15 : 17} /> : null}
      {children}
    </button>
  )
}

const STATUS_LABEL: Record<EntryStatus, string> = { DRAFT: 'Draft', IN_REVIEW: 'In review', PUBLISHED: 'Published', ARCHIVED: 'Archived' }

export function StatusBadge({ status }: { status: EntryStatus }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  )
}

export function PageHeader({ overline, title, children }: { overline: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="grow col" style={{ gap: 4 }}>
        <span className="caption">{overline}</span>
        <h1 className="display">{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function ErrorAlert({ error }: { error: unknown }) {
  return error ? (
    <div className="alert error fade-in" role="alert">
      {errorText(error)}
    </div>
  ) : null
}

export function Loading() {
  return (
    <div className="empty">
      <span className="spinner" style={{ display: 'inline-block' }} />
    </div>
  )
}

/** Segmented control with a sliding gradient thumb (CSS transition on left/width). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ left: 4, width: 0 })
  useLayoutEffect(() => {
    const btn = ref.current?.querySelector<HTMLButtonElement>(`button[data-value="${value}"]`)
    if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth })
  }, [value, options.length])
  return (
    <div className="segmented" ref={ref} role="radiogroup">
      <span className="thumb" style={{ left: thumb.left, width: thumb.width }} />
      {options.map(o => (
        <button key={o.value} type="button" data-value={o.value} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
