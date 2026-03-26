import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useAppStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import {
  Plus, FolderOpen, Users, Key, Calendar,
  Database, Sun, Moon, ArrowLeftRight, FlaskConical,
  Bug, Search, BarChart3, ChevronRight, ShieldCheck, LogOut
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import TDBankLogo from '@/components/shared/TDBankLogo'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const DOMAIN_BORDER = {
  Payments:  'border-blue-500',
  Accounts:  'border-purple-500',
  Lending:   'border-amber-500',
  Transfers: 'border-td-green',
  Wealth:    'border-emerald-500',
  Other:     'border-gray-400',
}

const DOMAIN_BADGE = {
  Payments:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Accounts:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Lending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Transfers: 'bg-td-green/10 text-td-green',
  Wealth:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Other:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const MODULES = [
  { label: 'Tosca', icon: ArrowLeftRight },
  { label: 'Test Gen', icon: FlaskConical },
  { label: 'RCA', icon: Bug },
  { label: 'Impact', icon: Search },
  { label: 'Regression', icon: BarChart3 },
]

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const { isAdmin, isSuperAdmin, user, logout } = useAuth()
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const { setActiveProjectId, demoMode, toggleDemo, isDark, toggleDark } = useAppStore()
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', jira_project_key: '', domain_tag: 'Payments' })

  const handleOpen = (projectId) => {
    setActiveProjectId(projectId)
    navigate(`/projects/${projectId}`)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    try {
      const project = await createProject.mutateAsync(form)
      toast.success(`Project "${project.name}" created`)
      setShowCreate(false)
      setForm({ name: '', jira_project_key: '', domain_tag: 'Payments' })
      handleOpen(project.id)
    } catch {
      toast.error('Failed to create project')
    }
  }

  const totalMembers = (projects || []).reduce((s, p) => s + (p.member_count || 0), 0)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Fixed Header ─────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-[#0D1F14] border-b border-border flex items-center px-6 gap-3"
        style={{ height: '56px' }}
      >
        <div className="flex items-center gap-2">
          <TDBankLogo size={28} />
          <span className="font-bold text-foreground">QGenie 2.0</span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm text-muted-foreground">Projects</span>
        </div>
        <div className="flex-1" />

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

        <button
          data-testid="dark-mode-toggle-projects"
          onClick={toggleDark}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          data-testid="create-project-btn"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-td-green text-white text-sm font-medium rounded-lg hover:bg-td-dark-green transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>

        {/* Avatar / User Menu */}
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
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="pt-[56px] min-h-screen flex flex-col">

        {/* Hero strip */}
        <div className="bg-white dark:bg-[#0D1F14] border-b border-border px-10 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-td-green mb-1">
            TD Bank TCoE
          </p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Your Projects'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a project to access AI-powered QA modules
          </p>

          {/* Stats row */}
          {!isLoading && projects?.length > 0 && (
            <div className="flex items-center gap-6 mt-5">
              {[
                { label: 'Projects', value: projects.length },
                { label: 'Team Members', value: totalMembers },
                { label: 'AI Modules', value: 5 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{value}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cards area */}
        <div className="flex-1 px-10 py-8">
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isLoading && projects?.length === 0 && (
            <div
              data-testid="projects-empty-state"
              className="flex flex-col items-center justify-center py-28 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Create your first project to start using AI-powered QA modules.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-td-green text-white rounded-lg text-sm font-medium hover:bg-td-dark-green transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>
          )}

          {!isLoading && projects?.length > 0 && (
            <div
              data-testid="projects-grid"
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
            >
              {projects.map((project) => (
                <div
                  key={project.id}
                  data-testid={`project-card-${project.id}`}
                  onClick={() => handleOpen(project.id)}
                  className={`group relative bg-card border-l-4 ${DOMAIN_BORDER[project.domain_tag] || DOMAIN_BORDER.Other} border border-border rounded-xl p-5 hover:shadow-lg hover:border-border cursor-pointer transition-all duration-200 flex flex-col`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground tracking-wider">
                        {project.jira_project_key}
                      </span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${DOMAIN_BADGE[project.domain_tag] || DOMAIN_BADGE.Other}`}>
                      {project.domain_tag}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="text-base font-semibold text-foreground group-hover:text-td-green transition-colors mb-1">
                    {project.name}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {project.member_count} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Module chips */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {MODULES.map(({ label, icon: Icon }) => (
                      <span
                        key={label}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-td-green/10 text-td-green dark:bg-td-green/20 font-medium border border-td-green/20"
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                    <span
                      data-testid={`open-project-${project.id}`}
                      className="text-sm font-semibold text-td-green group-hover:underline"
                    >
                      Open Project
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-td-green group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Create Project Dialog (properly centered) ─────── */}
      <CenteredDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create New Project"
        description="Set up a new QA project for your TD Bank team."
        width="440px"
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              data-testid="create-project-name"
              className="mt-1.5 w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. TD Wealth Platform"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Jira Project Key
            </label>
            <input
              data-testid="create-project-jira-key"
              className="mt-1.5 w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              value={form.jira_project_key}
              onChange={(e) => setForm((f) => ({ ...f, jira_project_key: e.target.value.toUpperCase() }))}
              placeholder="e.g. TWP"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Domain
            </label>
            <select
              data-testid="create-project-domain"
              className="mt-1.5 w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.domain_tag}
              onChange={(e) => setForm((f) => ({ ...f, domain_tag: e.target.value }))}
            >
              {['Payments', 'Accounts', 'Lending', 'Transfers', 'Wealth', 'Other'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="create-project-submit-btn"
            onClick={handleCreate}
            disabled={!form.name.trim() || createProject.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createProject.isPending && <LoadingSpinner size="sm" />}
            Create Project
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}
