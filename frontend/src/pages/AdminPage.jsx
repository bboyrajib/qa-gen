import { useState, useMemo, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, createColumnHelper
} from '@tanstack/react-table'
import * as Tabs from '@radix-ui/react-tabs'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Plus, Search, Check, ArrowLeft, Pencil, UserX, Settings, Trash2, Info, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Users, FolderOpen, Layers } from 'lucide-react'
import TDBankLogo from '@/components/shared/TDBankLogo'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAppStore } from '@/store'
import { DEMO_USERS, DEMO_PROJECT_MEMBERS } from '@/lib/demo-data'
import { CenteredDialog } from '@/components/shared/CenteredDialog'

const ROLE_BADGE = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  admin:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  user:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  user:        'Member',
}

const ROLE_DESC = {
  super_admin: 'Full access to all projects and system settings',
  admin:       'System admin — manages assigned projects',
  user:        'Access limited to assigned projects',
}

const colHelper = createColumnHelper()

export default function AdminPage() {
  const { isSuperAdmin, user: currentUser } = useAuth()
  const { data: projects } = useProjects()
  const demoMode = useAppStore((s) => s.demoMode)
  const globalModules = useAppStore((s) => s.globalModules)
  const setGlobalModules = useAppStore((s) => s.setGlobalModules)
  const setGlobalModuleEnabled = useAppStore((s) => s.setGlobalModuleEnabled)

  // ALL hooks must be declared before any early return
  const [allUsers, setAllUsers] = useState(DEMO_USERS)
  const users = allUsers

  // Per-project membership map: { [projectId]: [{ user_id, project_role }] }
  const [projectMemberships, setProjectMemberships] = useState(() => {
    const copy = {}
    Object.entries(DEMO_PROJECT_MEMBERS).forEach(([pid, members]) => {
      copy[pid] = [...members]
    })
    return copy
  })

  const ALL_MODULES = [
    { id: 'tosca', label: 'Tosca Test Automation', description: 'Generate Tosca test cases from requirements or user stories.' },
    { id: 'test-gen', label: 'Test Case Generation', description: 'AI-driven test case generation from specifications.' },
    { id: 'rca', label: 'Root Cause Analysis', description: 'Analyze failed test runs and identify root causes.' },
    { id: 'impact', label: 'Impact Analysis', description: 'Assess the impact of code changes on existing test coverage.' },
    { id: 'regression', label: 'Regression Suite', description: 'Automatically build and optimize regression test suites.' },
  ]

  useEffect(() => {
    if (demoMode) return
    api.get('/api/v1/admin/modules')
      .then((res) => { setGlobalModules(res.data?.modules || {}) })
      .catch(() => {})
  }, [demoMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const [globalFilter, setGlobalFilter] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null)
  const [deletedProjectIds, setDeletedProjectIds] = useState([])
  const [showLegend, setShowLegend] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'user', project_memberships: []
  })

  const userColumns = useMemo(() => [
    colHelper.accessor('name', {
      header: 'Name',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('role', {
      header: 'Role & Access',
      cell: (info) => {
        const r = info.getValue() || (info.row.original.is_admin ? 'admin' : 'user')
        const userId = info.row.original.id

        // Compute per-project memberships for this user
        const memberships = r !== 'super_admin'
          ? (projects || []).reduce((acc, p) => {
              const m = (projectMemberships[p.id] || []).find((mem) => mem.user_id === userId)
              if (m) acc.push({ project_id: p.id, project_role: m.project_role, project_name: p.name })
              return acc
            }, [])
          : []

        return (
          <div className="flex flex-col gap-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${ROLE_BADGE[r] || ROLE_BADGE.user}`}>
              {ROLE_LABEL[r] || 'Member'}
            </span>
            <span className="text-[11px] text-muted-foreground">{ROLE_DESC[r]}</span>
            {r === 'super_admin' ? (
              <span className="text-[10px] text-td-green font-medium">All projects</span>
            ) : memberships.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {memberships.map((m) => (
                  <span
                    key={m.project_id}
                    className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                  >
                    {m.project_name}
                    <span className={`ml-1 font-semibold ${
                      m.project_role === 'admin'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      · {m.project_role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">No projects assigned</span>
            )}
          </div>
        )
      },
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
                const memberships = (projects || []).reduce((acc, p) => {
                  const m = (projectMemberships[p.id] || []).find((mem) => mem.user_id === u.id)
                  if (m) acc.push({ project_id: p.id, project_role: m.project_role })
                  return acc
                }, [])
                setEditUser(u)
                setUserForm({
                  name: u.name,
                  email: u.email,
                  password: '',
                  role: u.role || (u.is_admin ? 'admin' : 'user'),
                  project_memberships: memberships,
                })
                setShowAddUser(true)
              }}
              className="text-xs px-2 py-1 border border-border rounded text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {u.id !== currentUser?.id && (
              <button
                data-testid={`deactivate-user-${u.id}`}
                onClick={() => setConfirmDeactivate(u)}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                title={u.is_active ? 'Deactivate user' : 'Activate user'}
              >
                {u.is_active ? <UserX className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-td-green" />}
              </button>
            )}
          </div>
        )
      },
    }),
  ], [projects, currentUser, projectMemberships])

  // Manual filter avoids TanStack controlled-filter callbacks firing during render
  const filteredUsers = useMemo(() => {
    if (!globalFilter) return users
    const q = globalFilter.toLowerCase()
    return users.filter((u) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
  }, [users, globalFilter])

  const userTable = useReactTable({
    data: filteredUsers,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
      header: () => <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</span>,
      cell: (info) => (
        <div className="flex gap-2 justify-end">
          <Link
            to={`/projects/${info.row.original.id}/settings`}
            data-testid={`project-settings-${info.row.original.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border text-foreground hover:border-td-green hover:text-td-green transition-all duration-150"
          >
            <Settings className="w-3 h-3" /> Settings
          </Link>
          <button
            data-testid={`delete-project-${info.row.original.id}`}
            onClick={() => setConfirmDeleteProject(info.row.original)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/10 dark:border-red-800 transition-all duration-150"
            title="Delete project"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ),
    }),
  ], [])

  const visibleProjects = useMemo(
    () => (projects || []).filter((p) => !deletedProjectIds.includes(p.id)),
    [projects, deletedProjectIds]
  )

  const projectTable = useReactTable({
    data: visibleProjects,
    columns: projectColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Early return AFTER all hooks
  if (!isSuperAdmin) return <Navigate to="/projects" replace />

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.email) return
    const isAdminRole = userForm.role === 'admin' || userForm.role === 'super_admin'
    const project_access = userForm.role === 'super_admin'
      ? null
      : userForm.project_memberships.map((m) => m.project_id)
    const { project_memberships: _, ...formRest } = userForm
    const userPayload = { ...formRest, is_admin: isAdminRole, project_access }

    let savedId
    if (editUser) {
      savedId = editUser.id
      setAllUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...userPayload } : u))
      toast.success('User updated')
    } else {
      savedId = `user-${Date.now()}`
      setAllUsers((prev) => [...prev, { id: savedId, ...userPayload, is_active: true }])
      toast.success('User created')
    }

    // Sync project memberships (super_admin has universal access — no explicit rows needed)
    if (userForm.role !== 'super_admin') {
      setProjectMemberships((prev) => {
        const updated = {}
        Object.entries(prev).forEach(([pid, members]) => {
          updated[pid] = members.filter((m) => m.user_id !== savedId)
        })
        userForm.project_memberships.forEach((m) => {
          if (!updated[m.project_id]) updated[m.project_id] = []
          updated[m.project_id] = [...updated[m.project_id], { user_id: savedId, project_role: m.project_role }]
        })
        return updated
      })
    }

    setShowAddUser(false)
    setEditUser(null)
    setUserForm({ name: '', email: '', password: '', role: 'user', project_memberships: [] })
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${ROLE_BADGE.super_admin}`}>
            Super Admin
          </span>
        </div>
      </header>

      <main className="pt-[80px] px-8 pb-8 max-w-6xl mx-auto">
        <Tabs.Root defaultValue="users">
          <div className="flex items-center justify-between mb-4">
            <Tabs.List className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { value: 'users', label: 'Users', icon: Users },
                { value: 'projects', label: 'Projects', icon: FolderOpen },
                { value: 'modules', label: 'Modules', icon: Layers },
              ].map(({ value, label, icon: Icon }) => (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  data-testid={`admin-tab-${value}`}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A3626] data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          {/* Users Tab */}
          <Tabs.Content value="users">
            {/* Role Legend */}
            <div className="mb-4 border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLegend((s) => !s)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <Info className="w-3.5 h-3.5 text-td-green flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">Role Guide</span>
                {showLegend ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
              </button>
              {showLegend && (
                <div className="px-4 py-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Global Roles (system-wide)</p>
                    <div className="space-y-1.5">
                      {[
                        { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Super Admin', desc: 'Full access to all projects, users, and system settings. Manages modules per project.' },
                        { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Admin', desc: 'Can manage members in projects where they hold the project Admin role.' },
                        { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Member', desc: 'Access limited to assigned projects. Can submit and view their own jobs.' },
                      ].map(({ badge, label, desc }) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${badge}`}>{label}</span>
                          <p className="text-[11px] text-muted-foreground">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Project Roles (per project)</p>
                    <div className="space-y-1.5">
                      {[
                        { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Project Admin', desc: 'Can add/remove members and change roles within that specific project.' },
                        { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Project Member', desc: 'Can use all enabled modules and view their own jobs. No management access.' },
                      ].map(({ badge, label, desc }) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${badge}`}>{label}</span>
                          <p className="text-[11px] text-muted-foreground">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3 italic">
                      A user can be Project Admin in one project and Project Member in another simultaneously.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Users ({filteredUsers.length}{globalFilter ? ` of ${users.length}` : ''})</h2>
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
                  type="button"
                  data-testid="add-user-btn"
                  onClick={() => {
                    setEditUser(null)
                    setUserForm({ name: '', email: '', password: '', role: 'user', project_memberships: [] })
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
              <h2 className="text-lg font-semibold text-foreground">Projects ({visibleProjects.length})</h2>
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

          {/* Modules Tab */}
          <Tabs.Content value="modules">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Global Module Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Disabling a module here removes it from all projects system-wide.</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {ALL_MODULES.map((mod) => {
                const enabled = globalModules[mod.id]
                return (
                  <div key={mod.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{mod.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !globalModules[mod.id]
                        setGlobalModuleEnabled(mod.id, next)
                        toast.success(`${mod.label} ${next ? 'enabled' : 'disabled'} globally`)
                        if (!demoMode) {
                          api.patch('/api/v1/admin/modules', { modules: { [mod.id]: next } })
                            .catch(() => {
                              setGlobalModuleEnabled(mod.id, !next)
                              toast.error(`Failed to update ${mod.label}`)
                            })
                        }
                      }}
                      className="flex-shrink-0 focus:outline-none"
                      title={enabled ? 'Disable module' : 'Enable module'}
                    >
                      {enabled
                        ? <ToggleRight className="w-8 h-8 text-td-green" />
                        : <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </main>

      {/* Add/Edit User Dialog */}
      <CenteredDialog
        open={showAddUser}
        onOpenChange={(v) => { setShowAddUser(v); if (!v) setEditUser(null) }}
        title={editUser ? 'Edit User' : 'Add User'}
        width="500px"
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Global Role</label>
            <div className="flex gap-4 flex-wrap">
              {[
                { label: 'Member', value: 'user' },
                { label: 'Admin', value: 'admin' },
                { label: 'Super Admin', value: 'super_admin' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={userForm.role === opt.value}
                    onChange={() => setUserForm((f) => ({
                      ...f,
                      role: opt.value,
                      project_memberships: opt.value === 'super_admin' ? [] : f.project_memberships,
                    }))}
                    className="accent-td-green"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Project Memberships — hidden for super_admin */}
          {userForm.role !== 'super_admin' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Project Memberships
              </label>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-48 overflow-y-auto">
                {(projects || []).map((p) => {
                  const existing = userForm.project_memberships.find((m) => m.project_id === p.id)
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2 transition-colors ${existing ? 'bg-td-green/5' : 'bg-transparent hover:bg-muted/20'}`}
                    >
                      <Checkbox.Root
                        checked={!!existing}
                        onCheckedChange={(checked) => {
                          setUserForm((f) => ({
                            ...f,
                            project_memberships: checked
                              ? [...f.project_memberships, { project_id: p.id, project_role: 'member' }]
                              : f.project_memberships.filter((m) => m.project_id !== p.id),
                          }))
                        }}
                        className="w-4 h-4 rounded border border-border bg-input data-[state=checked]:bg-td-green data-[state=checked]:border-td-green flex items-center justify-center flex-shrink-0"
                      >
                        <Checkbox.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{p.name}</span>
                      {existing && (
                        <select
                          value={existing.project_role}
                          onChange={(e) => setUserForm((f) => ({
                            ...f,
                            project_memberships: f.project_memberships.map((m) =>
                              m.project_id === p.id ? { ...m, project_role: e.target.value } : m
                            ),
                          }))}
                          className="text-xs px-2 py-1 bg-input border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
              {(projects || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic mt-1">No projects available</p>
              )}
            </div>
          )}
          {userForm.role === 'super_admin' && (
            <p className="text-xs text-td-green bg-td-green/10 rounded-lg px-3 py-2">
              Super admins have full access to all projects and system settings — no project assignments needed.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => { setShowAddUser(false); setEditUser(null); setUserForm({ name: '', email: '', password: '', role: 'user', project_memberships: [] }) }}
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

      {/* Confirm Delete Project Dialog */}
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
            onClick={() => setConfirmDeleteProject(null)}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-project-btn"
            onClick={() => {
              const pid = confirmDeleteProject.id
              setDeletedProjectIds((prev) => [...prev, pid])
              // Remove from all users' project_access
              setAllUsers((prev) => prev.map((u) => ({
                ...u,
                project_access: u.project_access ? u.project_access.filter((id) => id !== pid) : null,
              })))
              // Remove from project memberships map
              setProjectMemberships((prev) => {
                const updated = { ...prev }
                delete updated[pid]
                return updated
              })
              toast.success(`Project "${confirmDeleteProject.name}" deleted`)
              setConfirmDeleteProject(null)
            }}
            className="px-4 py-2 text-sm rounded-md bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
          >
            Delete Project
          </button>
        </div>
      </CenteredDialog>

      {/* Confirm Deactivate / Activate Dialog */}
      <CenteredDialog
        open={!!confirmDeactivate}
        onOpenChange={(v) => !v && setConfirmDeactivate(null)}
        title={confirmDeactivate?.is_active ? 'Deactivate User?' : 'Activate User?'}
        width="400px"
      >
        <p className="text-sm text-muted-foreground mt-1">
          {confirmDeactivate?.is_active
            ? <>Are you sure you want to deactivate <span className="font-semibold text-foreground">{confirmDeactivate?.name}</span>? They will no longer be able to log in.</>
            : <>Re-activate <span className="font-semibold text-foreground">{confirmDeactivate?.name}</span>? They will regain access to their assigned projects.</>
          }
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setConfirmDeactivate(null)}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-deactivate-btn"
            onClick={() => {
              setAllUsers((prev) => prev.map((u) => u.id === confirmDeactivate.id ? { ...u, is_active: !u.is_active } : u))
              toast.success(`User ${confirmDeactivate.is_active ? 'deactivated' : 'activated'}`)
              setConfirmDeactivate(null)
            }}
            className={`px-4 py-2 text-sm rounded-md text-white font-medium transition-colors ${
              confirmDeactivate?.is_active
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-td-green hover:bg-td-dark-green'
            }`}
          >
            {confirmDeactivate?.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </CenteredDialog>

    </div>
  )
}
