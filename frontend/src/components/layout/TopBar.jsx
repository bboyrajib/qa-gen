import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import { useProjects } from '@/hooks/useProjects'
import {
  Bell, Sun, Moon, Database, User, LogOut,
  ChevronDown, Settings, ShieldCheck, Plus, ToggleLeft, ToggleRight
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { useCreateProject } from '@/hooks/useProjects'
import { toast } from 'sonner'

export default function TopBar() {
  const { user, logout, isAdmin } = useAuth()
  const { isDark, toggleDark, demoMode, toggleDemo, activeProjectId, setActiveProjectId } = useAppStore()
  const { data: projects } = useProjects()
  const navigate = useNavigate()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({ name: '', jira_project_key: '', domain_tag: 'Payments' })
  const createProject = useCreateProject()

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

  return (
    <header
      data-testid="topbar"
      className="fixed z-20 bg-white dark:bg-[#0D1F14] border-b border-border flex items-center px-4 gap-3"
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

      {/* Demo Mode Toggle */}
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
      <button
        data-testid="notification-bell"
        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-td-green rounded-full" />
      </button>

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
      <Dialog.Root open={showNewProject} onOpenChange={setShowNewProject}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-white dark:bg-[#1A3626] rounded-xl shadow-2xl border border-border p-6 animate-fade-in">
            <Dialog.Title className="text-lg font-semibold text-foreground mb-4">Create New Project</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name</label>
                <input
                  data-testid="new-project-name-input"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TD Wealth Platform"
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  )
}
