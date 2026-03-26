import { useState, useMemo } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useAppStore } from '@/store'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, createColumnHelper
} from '@tanstack/react-table'
import * as Tabs from '@radix-ui/react-tabs'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Switch from '@radix-ui/react-switch'
import { ShieldCheck, Plus, Search, Check, ArrowLeft, Pencil, UserX, Layers } from 'lucide-react'
import TDBankLogo from '@/components/shared/TDBankLogo'
import { toast } from 'sonner'
import { DEMO_USERS } from '@/lib/demo-data'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { CenteredDialog } from '@/components/shared/CenteredDialog'

const ROLE_BADGE = {
  true: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  false: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const ALL_MODULES = [
  { key: 'tosca', label: 'Tosca Conversion', description: 'Convert Tosca test cases to Playwright' },
  { key: 'test-gen', label: 'Test Generation', description: 'Generate Gherkin BDD from Jira stories' },
  { key: 'rca', label: 'Failure RCA', description: 'AI root cause analysis for pipeline failures' },
  { key: 'impact', label: 'Impact Analysis', description: 'Commit-level test impact and risk scoring' },
  { key: 'regression', label: 'Regression Optimizer', description: 'Smart regression suite reduction' },
]

const colHelper = createColumnHelper()

export default function AdminPage() {
  const { isAdmin, user: currentUser } = useAuth()
  const { data: projects } = useProjects()
  const demoMode = useAppStore((s) => s.demoMode)

  // ALL hooks must be declared before any early return
  const [users, setUsers] = useState(DEMO_USERS)
  const [globalFilter, setGlobalFilter] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [manageAccessUser, setManageAccessUser] = useState(null)
  const [manageModulesProject, setManageModulesProject] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', is_admin: false, project_access: []
  })

  const { getProjectModules, setModuleEnabled } = useAppStore()

  const userColumns = useMemo(() => [
    colHelper.accessor('name', {
      header: 'Name',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('is_admin', {
      header: 'Role',
      cell: (info) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[info.getValue()]}`}>
          {info.getValue() ? 'Admin' : 'Member'}
        </span>
      ),
    }),
    colHelper.accessor('is_active', {
      header: 'Status',
      cell: (info) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          info.getValue()
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {info.getValue() ? 'Active' : 'Inactive'}
        </span>
      ),
    }),
    colHelper.accessor('project_access', {
      header: 'Projects',
      cell: (info) => {
        const access = info.getValue()
        if (access === null) return <span className="text-xs text-td-green font-medium">All Projects</span>
        if (!access || access.length === 0) return <span className="text-xs text-muted-foreground">None</span>
        return (
          <span className="text-xs text-muted-foreground">
            {access.map((id) => projects?.find((p) => p.id === id)?.name || id).join(', ')}
          </span>
        )
      },
    }),
    colHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const u = info.row.original
        return (
          <div className="flex gap-2 justify-end">
            <button
              data-testid={`edit-user-${u.id}`}
              onClick={() => {
                setEditUser(u)
                setUserForm({ name: u.name, email: u.email, password: '', is_admin: u.is_admin, project_access: u.project_access || [] })
                setShowAddUser(true)
              }}
              className="text-xs px-2 py-1 border border-border rounded text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {u.id !== currentUser?.id && (
              <button
                data-testid={`deactivate-user-${u.id}`}
                onClick={() => {
                  setUsers((prev) => prev.map((usr) => usr.id === u.id ? { ...usr, is_active: !usr.is_active } : usr))
                  toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
                }}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
              >
                {u.is_active ? <UserX className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-td-green" />}
              </button>
            )}
          </div>
        )
      },
    }),
  ], [projects, currentUser])

  const userTable = useReactTable({
    data: users,
    columns: userColumns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const projectColumns = useMemo(() => [
    colHelper.accessor('name', {
      header: 'Project Name',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('domain_tag', {
      header: 'Domain',
      cell: (info) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-td-green/10 text-td-green font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    colHelper.accessor('jira_project_key', {
      header: 'Jira Key',
      cell: (info) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{info.getValue()}</code>,
    }),
    colHelper.accessor('member_count', { header: 'Members' }),
    colHelper.accessor('created_at', {
      header: 'Created',
      cell: (info) => <span className="text-xs text-muted-foreground">{new Date(info.getValue()).toLocaleDateString()}</span>,
    }),
    colHelper.display({
      id: 'project-actions',
      header: '',
      cell: (info) => (
        <div className="flex gap-2 justify-end">
          <button
            data-testid={`manage-modules-${info.row.original.id}`}
            onClick={() => setManageModulesProject(info.row.original)}
            className="text-xs px-2 py-1 border border-border rounded text-muted-foreground hover:text-td-green hover:border-td-green/50 hover:bg-td-green/5 transition-colors flex items-center gap-1"
          >
            <Layers className="w-3 h-3" /> Modules
          </button>
          <button
            data-testid={`manage-access-${info.row.original.id}`}
            onClick={() => setManageAccessUser(info.row.original)}
            className="text-xs px-2 py-1 border border-border rounded text-td-green hover:bg-td-green/10 transition-colors"
          >
            Manage Access
          </button>
        </div>
      ),
    }),
  ], [])

  const projectTable = useReactTable({
    data: projects || [],
    columns: projectColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Early return AFTER all hooks
  if (!isAdmin) return <Navigate to="/projects" replace />

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.email) return
    if (editUser) {
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...userForm } : u))
      toast.success('User updated')
    } else {
      setUsers((prev) => [...prev, { id: `user-${Date.now()}`, ...userForm, is_active: true }])
      toast.success('User created')
    }
    setShowAddUser(false)
    setEditUser(null)
    setUserForm({ name: '', email: '', password: '', is_admin: false, project_access: [] })
  }

  const handleProjectAccess = (userId, projectId, hasAccess) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u
      if (u.is_admin) return u
      const current = u.project_access || []
      const updated = hasAccess ? [...current, projectId] : current.filter((id) => id !== projectId)
      return { ...u, project_access: updated }
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-[#0D1F14] border-b border-border flex items-center px-6 gap-4"
        style={{ height: '56px' }}
      >
        <Link to="/projects" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <TDBankLogo size={24} />
          <span className="font-bold text-foreground">QGenie 2.0</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground font-medium">Admin Panel</span>
        </div>
      </header>

      <main className="pt-[80px] px-8 pb-8 max-w-6xl mx-auto">
        <Tabs.Root defaultValue="users">
          <div className="flex items-center justify-between mb-4">
            <Tabs.List className="flex gap-1 bg-muted rounded-lg p-1">
              {[{ value: 'users', label: 'Users' }, { value: 'projects', label: 'Projects' }].map((t) => (
                <Tabs.Trigger
                  key={t.value}
                  value={t.value}
                  data-testid={`admin-tab-${t.value}`}
                  className="px-4 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A3626] data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
                >
                  {t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          {/* Users Tab */}
          <Tabs.Content value="users">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Users ({users.length})</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    data-testid="admin-user-search"
                    className="pl-8 pr-3 py-2 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-52"
                    placeholder="Search users..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                </div>
                <button
                  data-testid="add-user-btn"
                  onClick={() => {
                    setEditUser(null)
                    setUserForm({ name: '', email: '', password: '', is_admin: false, project_access: [] })
                    setShowAddUser(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-td-green text-white text-sm font-medium rounded-lg hover:bg-td-dark-green transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  {userTable.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-border bg-muted/30">
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {userTable.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className={`transition-colors hover:bg-muted/20 ${i % 2 ? 'bg-muted/10' : ''}`}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tabs.Content>

          {/* Projects Tab */}
          <Tabs.Content value="projects">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Projects ({projects?.length || 0})</h2>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  {projectTable.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-border bg-muted/30">
                      {hg.headers.map((h) => (
                        <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {projectTable.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className={`transition-colors hover:bg-muted/20 ${i % 2 ? 'bg-muted/10' : ''}`}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </main>

      {/* Add/Edit User Dialog */}
      <CenteredDialog
        open={showAddUser}
        onOpenChange={(v) => { setShowAddUser(v); if (!v) setEditUser(null) }}
        title={editUser ? 'Edit User' : 'Add User'}
        width="480px"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name *</label>
              <input
                data-testid="user-form-name"
                className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={userForm.name}
                onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
              <input
                data-testid="user-form-email"
                type="email"
                className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {editUser ? 'Reset Password (leave blank to keep)' : 'Temporary Password *'}
            </label>
            <div className="relative mt-1">
              <input
                data-testid="user-form-password"
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Role</label>
            <div className="flex gap-4">
              {[{ label: 'Member', value: false }, { label: 'Admin', value: true }].map((opt) => (
                <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={userForm.is_admin === opt.value}
                    onChange={() => setUserForm((f) => ({
                      ...f,
                      is_admin: opt.value,
                      project_access: opt.value ? null : []
                    }))}
                    className="accent-td-green"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {!userForm.is_admin && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Project Access
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(projects || []).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox.Root
                      checked={(userForm.project_access || []).includes(p.id)}
                      onCheckedChange={(checked) => {
                        setUserForm((f) => ({
                          ...f,
                          project_access: checked
                            ? [...(f.project_access || []), p.id]
                            : (f.project_access || []).filter((id) => id !== p.id),
                        }))
                      }}
                      className="w-4 h-4 rounded border border-border bg-input data-[state=checked]:bg-td-green data-[state=checked]:border-td-green flex items-center justify-center"
                    >
                      <Checkbox.Indicator>
                        <Check className="w-3 h-3 text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span className="text-sm text-foreground">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => { setShowAddUser(false); setEditUser(null) }}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="user-form-submit"
            onClick={handleSaveUser}
            disabled={!userForm.name || !userForm.email}
            className="px-4 py-2 text-sm rounded-md bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50"
          >
            {editUser ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </CenteredDialog>

      {/* Manage Access Dialog */}
      <CenteredDialog
        open={!!manageAccessUser}
        onOpenChange={(v) => !v && setManageAccessUser(null)}
        title={manageAccessUser ? `Manage Access — ${manageAccessUser.name}` : ''}
        description="Toggle project access for this user"
        width="420px"
      >
        <div className="space-y-2">
          {(projects || []).map((p) => {
            const u = users.find((u) => u.id === manageAccessUser?.id)
            const hasAccess = u?.is_admin || (u?.project_access || []).includes(p.id)
            return (
              <label key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                <span className="text-sm text-foreground">{p.name}</span>
                <Checkbox.Root
                  checked={hasAccess}
                  disabled={u?.is_admin}
                  onCheckedChange={(checked) => {
                    handleProjectAccess(manageAccessUser.id, p.id, checked)
                    toast.success(`Access ${checked ? 'granted' : 'revoked'} for ${p.name}`)
                  }}
                  className="w-4 h-4 rounded border border-border bg-input data-[state=checked]:bg-td-green data-[state=checked]:border-td-green flex items-center justify-center disabled:opacity-50"
                >
                  <Checkbox.Indicator>
                    <Check className="w-3 h-3 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
              </label>
            )
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setManageAccessUser(null)}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Done
          </button>
        </div>
      </CenteredDialog>

      {/* Manage Modules Dialog */}
      <CenteredDialog
        open={!!manageModulesProject}
        onOpenChange={(v) => !v && setManageModulesProject(null)}
        title={manageModulesProject ? `Manage Modules — ${manageModulesProject.name}` : ''}
        description="Enable or disable AI modules for this project. Disabled modules are hidden from the project sidebar."
        width="480px"
      >
        {manageModulesProject && (
          <div className="space-y-2 mt-2">
            {ALL_MODULES.map((mod) => {
              const modules = getProjectModules(manageModulesProject.id)
              const enabled = modules[mod.key] !== false
              return (
                <div
                  key={mod.key}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    enabled
                      ? 'border-td-green/30 bg-td-green/5 dark:bg-td-green/10'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {mod.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                  </div>
                  <Switch.Root
                    data-testid={`module-toggle-${mod.key}`}
                    checked={enabled}
                    onCheckedChange={(checked) => {
                      setModuleEnabled(manageModulesProject.id, mod.key, checked)
                      toast.success(`${mod.label} ${checked ? 'enabled' : 'disabled'} for ${manageModulesProject.name}`)
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none data-[state=checked]:bg-td-green data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                  >
                    <Switch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
                  </Switch.Root>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button
            data-testid="manage-modules-done"
            onClick={() => setManageModulesProject(null)}
            className="px-4 py-2 text-sm bg-td-green text-white rounded-lg hover:bg-td-dark-green transition-colors"
          >
            Save & Close
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}
