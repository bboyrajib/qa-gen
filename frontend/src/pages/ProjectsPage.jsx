import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useAppStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import {
  Plus, FolderOpen, Users, Calendar,
  Database, Sun, Moon,
  Search, ChevronRight, ShieldCheck, LogOut, KeyRound, Trash2,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import TDBankLogo from '@/components/shared/TDBankLogo'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import ChangePasswordDialog from '@/components/shared/ChangePasswordDialog'
import { toast } from 'sonner'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { DEMO_PROJECT_MEMBERS } from '@/lib/demo-data'

const DOMAIN_COLOR = {
  Payments:  '#3b82f6',
  Accounts:  '#a855f7',
  Lending:   '#f59e0b',
  Transfers: '#00A651',
  Wealth:    '#10b981',
  Other:     '#9ca3af',
}

const DOMAIN_BADGE = {
  Payments:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Accounts:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Lending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Transfers: 'bg-td-green/10 text-td-green',
  Wealth:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Other:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const { isAdmin, isSuperAdmin, user, logout, changePassword } = useAuth()
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const { setActiveProjectId, demoMode, toggleDemo, isDark, toggleDark } = useAppStore()
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', jira_project_key: '', domain_tag: 'Payments' })
  const [search, setSearch] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null)
  const [deletedProjectIds, setDeletedProjectIds] = useState([])

  const canDeleteProject = (project) => {
    if (isSuperAdmin) return true
    if (!user) return false
    const members = DEMO_PROJECT_MEMBERS[project.id] || []
    return members.some((m) => m.user_id === user.id && m.project_role === 'admin')
  }

  const filteredProjects = (projects || []).filter((p) =>
    !deletedProjectIds.includes(p.id) && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.jira_project_key || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.domain_tag || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  const handleDeleteProject = () => {
    if (!confirmDeleteProject) return
    setDeletedProjectIds((prev) => [...prev, confirmDeleteProject.id])
    toast.success(`Project "${confirmDeleteProject.name}" deleted`)
    setConfirmDeleteProject(null)
  }

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
  const firstName = user?.name ? user.name.split(' ')[0] : null

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#0a1a10]">

      {/* ── Header ───────────────────────────────────────────── */}
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
              {isSuperAdmin && (
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
                data-testid="change-password-btn"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted dark:hover:bg-white/10 text-foreground outline-none"
                onSelect={() => setShowChangePassword(true)}
              >
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Change Password
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
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

      {/* ── Page body ────────────────────────────────────────── */}
      <main className="pt-[56px] min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0D1F14] border-b border-border px-10 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-td-green mb-2">TD Bank TCoE</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {firstName ? `${getGreeting()}, ${firstName}` : 'Your Projects'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 mb-6">
            Manage your QA projects and access AI-powered testing modules
          </p>

          {/* Summary pills */}
          {!isLoading && projects?.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-sm text-foreground">
                <FolderOpen className="w-3.5 h-3.5 text-td-green" />
                <span className="font-semibold">{projects.length}</span>
                <span className="text-muted-foreground">Projects</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-sm text-foreground">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">{totalMembers}</span>
                <span className="text-muted-foreground">Team Members</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Projects area ─────────────────────────────────────── */}
        <div className="px-10 py-8">

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
                data-testid="create-project-btn"
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-td-green text-white rounded-lg text-sm font-medium hover:bg-td-dark-green transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>
          )}

          {!isLoading && projects?.length > 0 && (
            <>
              {/* ── Toolbar ── */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    data-testid="project-search"
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-white/5 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    placeholder="Search by name, key or domain…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap px-1">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1" />
                <button
                  data-testid="create-project-btn"
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-td-green text-white text-sm font-medium rounded-xl hover:bg-td-dark-green transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>

              {/* ── Grid ── */}
              <div
                data-testid="projects-grid"
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}
              >
                {filteredProjects.length === 0 && (
                  <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
                    No projects match <span className="font-medium text-foreground">"{search}"</span>
                  </div>
                )}

                {filteredProjects.map((project) => {
                  const domainColor = DOMAIN_COLOR[project.domain_tag] || DOMAIN_COLOR.Other

                  return (
                    <div
                      key={project.id}
                      data-testid={`project-card-${project.id}`}
                      onClick={() => handleOpen(project.id)}
                      className="group bg-white dark:bg-[#0f2318] border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 flex flex-col"
                    >
                      {/* Colored top strip */}
                      <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: domainColor }} />

                      {/* Card body */}
                      <div className="px-5 pt-4 pb-4 flex flex-col flex-1">

                        {/* Row: avatar + key + active badge + domain */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-wide flex-shrink-0"
                              style={{ backgroundColor: domainColor }}
                            >
                              {(project.jira_project_key || 'PR').slice(0, 3)}
                            </div>
                            <p className="text-[11px] font-semibold text-muted-foreground leading-none">
                              {project.jira_project_key}
                            </p>
                          </div>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${DOMAIN_BADGE[project.domain_tag] || DOMAIN_BADGE.Other}`}>
                            {project.domain_tag}
                          </span>
                        </div>

                        {/* Project name */}
                        <h3 className="text-[15px] font-semibold text-foreground group-hover:text-td-green transition-colors leading-snug mb-1">
                          {project.name}
                        </h3>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            {project.member_count} members
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                      </div>

                      {/* Footer */}
                      <div className="px-5 py-3 border-t border-border/60 bg-muted/20 dark:bg-white/[0.02] flex items-center justify-between">
                        <span
                          data-testid={`open-project-${project.id}`}
                          className="text-[13px] font-semibold text-td-green group-hover:underline underline-offset-2"
                        >
                          Open Project
                        </span>
                        <div className="flex items-center gap-1.5">
                          {canDeleteProject(project) && (
                            <button
                              type="button"
                              data-testid={`delete-project-${project.id}`}
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteProject(project) }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-td-green group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        onSubmit={changePassword}
      />

      {/* ── Confirm Delete ────────────────────────────────────── */}
      <CenteredDialog
        open={!!confirmDeleteProject}
        onOpenChange={(v) => !v && setConfirmDeleteProject(null)}
        title="Delete Project?"
        width="440px"
      >
        <p className="text-sm text-muted-foreground mt-1">
          This will permanently deactivate{' '}
          <span className="font-semibold text-foreground">{confirmDeleteProject?.name}</span> and
          remove it from all users' project access. All associated jobs and member records will be
          inaccessible. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setConfirmDeleteProject(null)}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-delete-project-btn"
            onClick={handleDeleteProject}
            className="px-4 py-2 text-sm rounded-lg bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
          >
            Delete Project
          </button>
        </div>
      </CenteredDialog>

      {/* ── Create Project ────────────────────────────────────── */}
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
