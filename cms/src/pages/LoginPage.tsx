import { Network } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth } from '../auth-context'
import { Button, ErrorAlert, Field } from '../ui'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={submit} className="card stack" style={{ width: 400, maxWidth: '100%', gap: 18, boxShadow: '0 20px 60px rgba(6,182,212,0.12)' }}>
        <div className="col" style={{ alignItems: 'center', gap: 10 }}>
          <div className="brand-logo" style={{ width: 52, height: 52, borderRadius: 16 }}>
            <Network size={26} color="#04161C" />
          </div>
          <h1 className="title">SkillTree CMS</h1>
          <p className="caption">Content, themes and configuration without an app release.</p>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        <ErrorAlert error={error} />
        <Button variant="primary" type="submit" loading={busy}>
          Sign in
        </Button>
        <p className="hint" style={{ textAlign: 'center' }}>
          Editors draft, publishers approve. Every change is audited.
        </p>
      </form>
    </div>
  )
}
