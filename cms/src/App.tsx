import { Navigate, Route, Routes } from 'react-router'

import { useAuth } from './auth-context'
import { Layout } from './Layout'
import { AppConfigPage } from './pages/AppConfigPage'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ReleasesPage } from './pages/ReleasesPage'
import { TemplateEditorPage } from './pages/TemplateEditorPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { ThemePage } from './pages/ThemePage'

export function App() {
  const { session } = useAuth()
  if (!session) return <LoginPage />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/new" element={<TemplateEditorPage />} />
        <Route path="templates/:id" element={<TemplateEditorPage />} />
        <Route path="theme" element={<ThemePage />} />
        <Route path="config" element={<AppConfigPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
