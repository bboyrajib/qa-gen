import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore, useNotificationStore } from '@/store'
import { useProjects } from '@/hooks/useProjects'
import {
  Bell, Sun, Moon, Database, LogOut,
  ChevronDown, ShieldCheck, Plus, CheckCircle2, AlertCircle, Clock, Loader2
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useCreateProject } from '@/hooks/useProjects'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import { timeAgo, requestNotificationPermission } from '@/lib/utils'

const MODULE_LABELS = {
  'tosca-convert': 'Tosca Conversion',
  'test-gen': 'Test Generation',
  rca: 'Failure RCA',
  impact: 'Impact Analysis',
  regression: 'Regression Optimizer',
}

const MODULE_PATHS = {
  'tosca-convert': 'tosca',
  'test-gen': 'test-gen',
  rca: 'rca',
  impact: 'impact',
  regression: 'regression',
}

const STATUS_ICON = {
  COMPLETE: <CheckCircle2 className="w-3.5 h-3.5 text-td-green flex-shrink-0" />,
  FAILED: <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
  RUNNING: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />,
  QUEUED: <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
}

export default function TopBar() {
  const { user, logout, isAdmin } = useAuth()
  const { isDark, toggleDark, demoMode, toggleDemo, activeProjectId, setActiveProjectId } = useAppStore()
  const { data: projects } = useProjects()
  const navigate = useNavigate()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({ name: '', jira_project_key: '', domain_tag: 'Payments' })
  const createProject = useCreateProject()

  const { getProjectNotifications, getUnreadCount, markAllRead, dismissAll } = useNotificationStore()
  const notifications = activeProjectId ? getProjectNotifications(activeProjectId) : []
  const unreadCount = activeProjectId ? getUnreadCount(activeProjectId) : 0

  const activeProject = projects?.find((p) => p.id === activeProjectId)
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const handleCreateProject = async () => {
    if (!newProjectForm.name.trim()) return
    try {
      const project = await createProject.mutateAsync(newProjectForm)
      toast.success(`Project "${project.name}" created`)
      setShowNewProject(false)
      setNewProjectForm({ name: '', jira_project_key: '', domain_tag: 'Payments' })
      setActiveProjectId(project.id)
      navigate(`/projects/${project.id}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  const handleBellOpen = () => {
    requestNotificationPermission()
  }

  const handleNotificationClick = (notif) => {
    if (!activeProjectId || !notif.type) return
    const path = MODULE_PATHS[notif.type]
    if (path) navigate(`/projects/${activeProjectId}/${path}`, { state: { autoShow: notif.status === 'COMPLETE' } })
  }

  return (
    <header
      data-testid="topbar"
      className="fixed z-20 bg-topbar border-b border-border flex items-center px-4 gap-3"
      style={{ left: '240px', right: '380px', top: 0, height: '56px' }}
    >
      {/* Project Selector */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            data-testid="project-selector-trigger"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors max-w-[220px]"
          >
            <span className="truncate text-foreground">
              {activeProject?.name || 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[220px] bg-white dark:bg-[#1A3626] rounded-lg border border-border shadow-lg p-1 animate-fade-in"
            sideOffset={4}
          >
            {(projects || []).map((p) => (
              <DropdownMenu.Item
                key={p.id}
                data-testid={`project-option-${p.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted dark:hover:bg-white/10 text-foreground outline-none"
                onSelect={() => {
                  setActiveProjectId(p.id)
                  navigate(`/projects/${p.id}`)
                }}
              >
                <span className="w-2 h-2 rounded-full bg-td-green flex-shrink-0" />
                {p.name}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              data-testid="create-new-project-btn"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted dark:hover:bg-white/10 text-td-green outline-none"
              onSelect={() => setShowNewProject(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Project
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div className="flex-1" />

      {/* Demo Mode Toggle — Admin only */}
      {isAdmin && (
        <button
          data-testid="demo-mode-toggle"
          onClick={toggleDemo}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            demoMode
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
              : 'bg-muted text-muted-foreground border-border'
          }`}
          title="Toggle demo data on/off"
        >
          <Database className="w-3 h-3" />
          {demoMode ? 'Demo ON' : 'Demo OFF'}
        </button>
      )}

      {/* Dark Mode */}
      <button
        data-testid="dark-mode-toggle"
        onClick={toggleDark}
        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notification Bell */}
      <DropdownMenu.Root onOpenChange={(open) => open && handleBellOpen()}>
        <DropdownMenu.Trigger asChild>
          <button
            data-testid="notification-bell"
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-td-green text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 w-[360px] bg-white dark:bg-[#1A3626] rounded-xl border border-border shadow-xl animate-fade-in"
            sideOffset={6}
            align="end"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-td-green/10 text-td-green rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  data-testid="mark-all-read"
                  className="text-xs text-muted-foreground hover:text-td-green transition-colors"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                  {!activeProjectId && (
                    <p className="text-xs text-muted-foreground mt-1">Select a project to see job notifications</p>
                  )}
                </div>
              ) : (
                notifications.slice(0, 15).map((notif) => (
                  <DropdownMenu.Item
                    key={notif.id}
                    data-testid={`notification-item-${notif.id}`}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer outline-none transition-colors hover:bg-muted/40 dark:hover:bg-white/5 ${
                      !notif.read ? 'bg-td-green/5 dark:bg-td-green/10' : ''
                    }`}
                    onSelect={() => handleNotificationClick(notif)}
                  >
                    <div className="mt-0.5">{STATUS_ICON[notif.status] || STATUS_ICON.QUEUED}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {MODULE_LABELS[notif.type] || notif.type}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-td-green flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span className={`font-medium ${
                          notif.status === 'COMPLETE' ? 'text-td-green' :
                          notif.status === 'FAILED' ? 'text-red-500' :
                          notif.status === 'RUNNING' ? 'text-blue-500' : 'text-amber-500'
                        }`}>
                          {notif.status}
                        </span>
                        {' · '}Job <code className="font-mono text-foreground/70">{notif.jobId}</code>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Triggered by <span className="text-foreground">{notif.triggeredBy}</span>
                        {' · '}
                        {timeAgo(notif.timestamp)}
                      </p>
                    </div>
                  </DropdownMenu.Item>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                <button
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={dismissAll}
                >
                  Clear all
                </button>
                {activeProjectId && (
                  <DropdownMenu.Item asChild>
                    <Link
                      to={`/projects/${activeProjectId}/jobs`}
                      className="text-xs text-td-green hover:underline outline-none"
                    >
                      View all jobs →
                    </Link>
                  </DropdownMenu.Item>
                )}
              </div>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* User Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            data-testid="user-menu-trigger"
            className="w-8 h-8 rounded-full bg-td-green flex items-center justify-center text-white text-xs font-semibold hover:bg-td-dark-green transition-colors"
            title={user?.name}
          >
            {initials}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[200px] bg-white dark:bg-[#1A3626] rounded-lg border border-border shadow-lg p-1 animate-fade-in"
            sideOffset={6}
            align="end"
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            {isAdmin && (
              <DropdownMenu.Item asChild>
                <Link
                  to="/admin"
                  data-testid="admin-panel-link"
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted dark:hover:bg-white/10 text-foreground outline-none"
                >
                  <ShieldCheck className="w-4 h-4 text-td-green" />
                  Admin Panel
                </Link>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              data-testid="sign-out-btn"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted dark:hover:bg-white/10 text-destructive outline-none"
              onSelect={logout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* New Project Dialog */}
      <CenteredDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
        title="Create New Project"
        width="420px"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name</label>
            <input
              data-testid="new-project-name-input"
              className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. TD Wealth Platform"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jira Project Key</label>
            <input
              data-testid="new-project-jira-input"
              className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={newProjectForm.jira_project_key}
              onChange={(e) => setNewProjectForm((f) => ({ ...f, jira_project_key: e.target.value.toUpperCase() }))}
              placeholder="e.g. TWP"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain</label>
            <select
              data-testid="new-project-domain-select"
              className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={newProjectForm.domain_tag}
              onChange={(e) => setNewProjectForm((f) => ({ ...f, domain_tag: e.target.value }))}
            >
              {['Payments', 'Accounts', 'Lending', 'Transfers', 'Wealth', 'Other'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowNewProject(false)}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="create-project-submit"
            onClick={handleCreateProject}
            disabled={!newProjectForm.name.trim()}
            className="px-4 py-2 text-sm rounded-md bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </CenteredDialog>
    </header>
  )
}
