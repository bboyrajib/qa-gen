import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAppStore } from '@/store'
import { isAuthenticated, getUser } from '@/lib/auth'
import LoginPage from '@/pages/LoginPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDashboard from '@/pages/ProjectDashboard'
import AdminPage from '@/pages/AdminPage'
import ProjectLayout from '@/components/layout/ProjectLayout'
import ToscaModule from '@/components/modules/ToscaModule'
import TestGenModule from '@/components/modules/TestGenModule'
import RCAModule from '@/components/modules/RCAModule'
import ImpactModule from '@/components/modules/ImpactModule'
import RegressionModule from '@/components/modules/RegressionModule'
import MyJobsPage from '@/pages/MyJobsPage'
import ProjectSettingsPage from '@/pages/ProjectSettingsPage'
import '@/App.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

function ThemeInitializer() {
  const initTheme = useAppStore((s) => s.initTheme)
  useEffect(() => {
    initTheme()
  }, [initTheme])
  return null
}

function AuthGuard({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return children
}

function AdminGuard({ children }) {
  const user = getUser()
  if (!isAuthenticated() || user?.role !== 'super_admin') return <Navigate to="/projects" replace />
  return children
}

function RootRedirect() {
  return <Navigate to={isAuthenticated() ? '/projects' : '/login'} replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          <Route path="/projects" element={<AuthGuard><ProjectsPage /></AuthGuard>} />
          <Route path="/projects/:projectId" element={<AuthGuard><ProjectLayout /></AuthGuard>}>
            <Route index element={<ProjectDashboard />} />
            <Route path="tosca" element={<ToscaModule />} />
            <Route path="test-gen" element={<TestGenModule />} />
            <Route path="rca" element={<RCAModule />} />
            <Route path="impact" element={<ImpactModule />} />
            <Route path="regression" element={<RegressionModule />} />
            <Route path="jobs" element={<MyJobsPage />} />
            <Route path="settings" element={<ProjectSettingsPage />} />
          </Route>
        </Routes>
        <Toaster position="bottom-center" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
