import { useEffect } from 'react'
import { Outlet, useParams, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatbotPanel from './ChatbotPanel'

export default function ProjectLayout() {
  const { projectId } = useParams()
  const { canAccessProject } = useAuth()
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId)

  useEffect(() => {
    setActiveProjectId(projectId)
  }, [projectId, setActiveProjectId])

  if (!canAccessProject(projectId)) {
    return <Navigate to="/projects" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className="flex flex-col flex-1"
        style={{ marginLeft: '240px', marginRight: '380px' }}
      >
        <TopBar />
        <main
          data-testid="main-content"
          className="flex-1 overflow-y-auto p-6 scrollbar-thin"
          style={{ marginTop: '56px' }}
        >
          <Outlet />
        </main>
      </div>
      <ChatbotPanel />
    </div>
  )
}
