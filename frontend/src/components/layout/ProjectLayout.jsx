import { useEffect } from 'react'
import { Outlet, useParams, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatbotPanel from './ChatbotPanel'

const MODULE_ROUTE_KEYS = ['tosca', 'test-gen', 'rca', 'impact', 'regression']

export default function ProjectLayout() {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { canAccessProject } = useAuth()
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const chatOpen = useAppStore((s) => s.chatOpen)
  const getProjectModules = useAppStore((s) => s.getProjectModules)
  useAppStore((s) => s.globalModules)

  const currentSegment = location.pathname.split('/').pop()
  const isModuleRoute = MODULE_ROUTE_KEYS.includes(currentSegment)
  const enabledModules = getProjectModules(projectId)
  const isDisabled = isModuleRoute && enabledModules[currentSegment] === false

  useEffect(() => {
    setActiveProjectId(projectId)
  }, [projectId, setActiveProjectId])

  useEffect(() => {
    if (isDisabled) {
      toast.error('This module is disabled for this project')
      navigate(`/projects/${projectId}`, { replace: true })
    }
  }, [isDisabled, navigate, projectId])

  if (!canAccessProject(projectId)) {
    return <Navigate to="/projects" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className="flex flex-col flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '240px' : '56px', marginRight: chatOpen ? '380px' : '0' }}
      >
        <TopBar />
        <main
          data-testid="main-content"
          className="flex-1 overflow-y-auto p-6 scrollbar-thin"
          style={{ marginTop: '64px' }}
        >
          <Outlet />
        </main>
      </div>
      <ChatbotPanel />
    </div>
  )
}
