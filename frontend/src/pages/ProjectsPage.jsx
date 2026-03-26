import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useAppStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { ShieldCheck, Plus, FolderOpen, Users, Tag, Key, Calendar, Database } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import TopBar from '@/components/layout/TopBar'

const DOMAIN_COLORS = {
  Payments: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Accounts: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Lending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Transfers: 'bg-td-green/10 text-td-green',
  Wealth: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const { isAdmin } = useAuth()
  const { setActiveProjectId, demoMode, toggleDemo } = useAppStore()
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

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone TopBar for Projects page */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-[#0D1F14] border-b border-border flex items-center px-6 gap-4" style={{ height: '56px' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-td-green" />
          <span className="font-bold text-foreground">QGenie 2.0</span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm text-muted-foreground">Projects</span>
        </div>
        <div className="flex-1" />
        {isAdmin && (
          <button
            data-testid="demo-mode-toggle"
            onClick={toggleDemo}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all mr-2 ${
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
          data-testid="create-project-btn"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-td-green text-white text-sm font-medium rounded-lg hover:bg-td-dark-green transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </header>

      <main className="pt-[56px] p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a project to access AI-powered QA modules</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div
            data-testid="projects-empty-state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first project to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-td-green text-white rounded-lg text-sm font-medium hover:bg-td-dark-green transition-colors"
            >
              Create Project
            </button>
          </div>
        )}

        {!isLoading && projects?.length > 0 && (
          <div data-testid="projects-grid" className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                data-testid={`project-card-${project.id}`}
                className="bg-card border border-border rounded-xl p-6 hover:border-td-green/50 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-td-green/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-td-green" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_COLORS[project.domain_tag] || DOMAIN_COLORS.Other}`}>
                    {project.domain_tag}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-td-green transition-colors">
                  {project.name}
                </h3>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    {project.jira_project_key}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.member_count} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  data-testid={`open-project-${project.id}`}
                  onClick={() => handleOpen(project.id)}
                  className="w-full py-2 border border-td-green/30 text-td-green text-sm font-medium rounded-lg hover:bg-td-green hover:text-white transition-all duration-200 group-hover:bg-td-green group-hover:text-white"
                >
                  Open Project
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-white dark:bg-[#1A3626] rounded-xl shadow-2xl border border-border p-6 animate-fade-in">
            <Dialog.Title className="text-lg font-semibold text-foreground mb-4">Create New Project</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name *</label>
                <input
                  data-testid="create-project-name"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TD Wealth Platform"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jira Project Key</label>
                <input
                  data-testid="create-project-jira-key"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.jira_project_key}
                  onChange={(e) => setForm((f) => ({ ...f, jira_project_key: e.target.value.toUpperCase() }))}
                  placeholder="e.g. TWP"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain Tag</label>
                <select
                  data-testid="create-project-domain"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="create-project-submit-btn"
                onClick={handleCreate}
                disabled={!form.name.trim() || createProject.isPending}
                className="px-4 py-2 text-sm rounded-md bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createProject.isPending && <LoadingSpinner size="sm" />}
                Create Project
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
