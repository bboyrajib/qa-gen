import { useState, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProjects'
import { useAppStore } from '@/store'
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import * as Checkbox from '@radix-ui/react-checkbox'
import {
  Settings, Users, Layers, Plus, Pencil, Trash2, Check, UserPlus, ShieldCheck, Shield, User
} from 'lucide-react'
import { CenteredDialog } from '@/components/shared/CenteredDialog'
import { toast } from 'sonner'
import api from '@/lib/api'
import { DEMO_USERS, DEMO_PROJECT_MEMBERS } from '@/lib/demo-data'

const ALL_MODULES = [
  { key: 'tosca', label: 'Tosca Conversion', description: 'Convert Tosca test cases to Playwright TypeScript' },
  { key: 'test-gen', label: 'Test Generation', description: 'Generate Gherkin BDD scenarios from Jira stories' },
  { key: 'rca', label: 'Failure RCA', description: 'AI root cause analysis for pipeline failures' },
  { key: 'impact', label: 'Impact Analysis', description: 'Commit-level test impact and risk scoring' },
  { key: 'regression', label: 'Regression Optimizer', description: 'Smart regression suite reduction' },
]

const PROJECT_ROLE_BADGE = {
  admin:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  member: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const ROLE_ICON = { admin: Shield, member: User }

export default function ProjectSettingsPage() {
  const { projectId } = useParams()
  const { user: currentUser, isSuperAdmin, isAdmin } = useAuth()
  const { data: project } = useProject(projectId)
  const { getProjectModules, setModuleEnabled, setProjectModulesFromBackend, globalModules, demoMode } = useAppStore()

  // Project members state — in real mode this would come from an API
  const [members, setMembers] = useState(() => {
    const seeds = DEMO_PROJECT_MEMBERS[projectId] || []
    return seeds.map((m) => {
      const user = DEMO_USERS.find((u) => u.id === m.user_id)
      return user ? { ...user, project_role: m.project_role } : null
    }).filter(Boolean)
  })

  const [showAddMember, setShowAddMember] = useState(false)
  const [editMember, setEditMember] = useState(null) // { ...user, project_role }
  const [memberForm, setMemberForm] = useState({ user_id: '', project_role: 'member' })
  const [createMode, setCreateMode] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '' })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null) // member object to remove

  // Determine if current user is a project admin (or super_admin)
  const isProjectAdmin = isSuperAdmin || (
    isAdmin && members.some((m) => m.id === currentUser?.id && m.project_role === 'admin')
  )

  // Users not yet in this project (available to add)
  const availableUsers = DEMO_USERS.filter(
    (u) => u.role !== 'super_admin' && !members.some((m) => m.id === u.id)
  )

  if (!isProjectAdmin) return <Navigate to={`/projects/${projectId}`} replace />

  const handleSaveMember = () => {
    if (editMember) {
      setMembers((prev) =>
        prev.map((m) => m.id === editMember.id ? { ...m, project_role: memberForm.project_role } : m)
      )
      toast.success(`${editMember.name}'s role updated to ${memberForm.project_role}`)
    } else if (createMode) {
      if (!newUserForm.name || !newUserForm.email) return
      const newUser = {
        id: `user-${Date.now()}`,
        name: newUserForm.name,
        email: newUserForm.email,
        role: 'user',
        is_admin: false,
        is_active: true,
        must_change_password: true,
        project_access: [projectId],
      }
      setMembers((prev) => [...prev, { ...newUser, project_role: memberForm.project_role }])
      toast.success(`${newUser.name} created and added to project`)
    } else {
      const user = DEMO_USERS.find((u) => u.id === memberForm.user_id)
      if (!user) return
      setMembers((prev) => [...prev, { ...user, project_role: memberForm.project_role }])
      toast.success(`${user.name} added to project`)
    }
    setShowAddMember(false)
    setEditMember(null)
    setMemberForm({ user_id: '', project_role: 'member' })
    setCreateMode(false)
    setNewUserForm({ name: '', email: '', password: '' })
  }

  const handleRemoveMember = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You can't remove yourself")
      return
    }
    setConfirmRemoveMember(member)
  }

  const doRemoveMember = () => {
    if (!confirmRemoveMember) return
    setMembers((prev) => prev.filter((m) => m.id !== confirmRemoveMember.id))
    toast.success(`${confirmRemoveMember.name} removed from project`)
    setConfirmRemoveMember(null)
  }

  const modules = getProjectModules(projectId)
  const visibleModules = ALL_MODULES.filter((mod) => globalModules[mod.key] !== false)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-td-green/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-td-green" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Project Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project?.name}</p>
        </div>
        {isSuperAdmin && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Super Admin
          </span>
        )}
      </div>

      <Tabs.Root defaultValue="members">
        <Tabs.List className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-6">
          {[
            { value: 'members', label: 'Members', icon: Users },
            ...(isSuperAdmin ? [{ value: 'modules', label: 'Modules', icon: Layers }] : []),
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              data-testid={`settings-tab-${value}`}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#1A3626] data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Members Tab */}
        <Tabs.Content value="members">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </h2>
            <button
              data-testid="add-member-btn"
              onClick={() => {
                setEditMember(null)
                const hasAvailable = availableUsers.length > 0
                setCreateMode(!hasAvailable)
                setMemberForm({ user_id: availableUsers[0]?.id || '', project_role: 'member' })
                setNewUserForm({ name: '', email: '', password: '' })
                setShowAddMember(true)
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-td-green text-white text-sm font-medium rounded-lg hover:bg-td-dark-green transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Member
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Name', 'Email', 'Project Role', 'Status', 'Actions'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member, i) => {
                  const RoleIcon = ROLE_ICON[member.project_role] || User
                  const isSelf = member.id === currentUser?.id
                  // Admins can only edit members; super_admin can edit anyone
                  const canEdit = isSuperAdmin || (member.project_role === 'member')
                  return (
                    <tr
                      key={member.id}
                      data-testid={`member-row-${member.id}`}
                      className={`transition-colors hover:bg-muted/20 ${i % 2 ? 'bg-muted/10' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-td-green/20 flex items-center justify-center text-td-green text-[10px] font-bold flex-shrink-0">
                            {member.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          {member.name}
                          {isSelf && <span className="text-[10px] text-muted-foreground italic">(you)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_ROLE_BADGE[member.project_role]}`}>
                          <RoleIcon className="w-3 h-3" />
                          {member.project_role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          member.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button
                              data-testid={`edit-member-${member.id}`}
                              onClick={() => {
                                setEditMember(member)
                                setMemberForm({ user_id: member.id, project_role: member.project_role })
                                setShowAddMember(true)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border text-foreground hover:border-td-green hover:text-td-green transition-all duration-150"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                          {!isSelf && canEdit && (
                            <button
                              data-testid={`remove-member-${member.id}`}
                              onClick={() => handleRemoveMember(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/10 dark:border-red-800 transition-all duration-150"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        {/* Modules Tab — super_admin only */}
        <Tabs.Content value="modules">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">AI Module Access</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Disabled modules are hidden from the project sidebar and cannot be used by any team member.
            </p>
          </div>
          <div className="space-y-3">
            {visibleModules.map((mod) => {
              const enabled = modules[mod.key] !== false
              return (
                <div
                  key={mod.key}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
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
                      setModuleEnabled(projectId, mod.key, checked)
                      toast.success(`${mod.label} ${checked ? 'enabled' : 'disabled'} for ${project?.name}`)
                      if (!demoMode) {
                        const currentModules = getProjectModules(projectId)
                        const enabledList = visibleModules
                          .map((m) => m.key)
                          .filter((k) => (k === mod.key ? checked : currentModules[k] !== false))
                        api.patch(`/api/v1/projects/${projectId}/modules`, { enabled_modules: enabledList })
                          .then((res) => setProjectModulesFromBackend(projectId, res.data.enabled_modules))
                          .catch(() => {
                            setModuleEnabled(projectId, mod.key, !checked)
                            toast.error(`Failed to update ${mod.label}`)
                          })
                      }
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none data-[state=checked]:bg-td-green data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                  >
                    <Switch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
                  </Switch.Root>
                </div>
              )
            })}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Confirm Remove Member Dialog */}
      <CenteredDialog
        open={!!confirmRemoveMember}
        onOpenChange={(v) => !v && setConfirmRemoveMember(null)}
        title="Remove Member?"
        width="400px"
      >
        <p className="text-sm text-muted-foreground mt-1">
          Remove <span className="font-semibold text-foreground">{confirmRemoveMember?.name}</span> from{' '}
          <span className="font-semibold text-foreground">{project?.name}</span>?
          They will lose access to this project immediately.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setConfirmRemoveMember(null)}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-remove-member-btn"
            onClick={doRemoveMember}
            className="px-4 py-2 text-sm rounded-md bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
          >
            Remove
          </button>
        </div>
      </CenteredDialog>

      {/* Add / Edit Member Dialog */}
      <CenteredDialog
        open={showAddMember}
        onOpenChange={(v) => {
          setShowAddMember(v)
          if (!v) {
            setEditMember(null)
            setMemberForm({ user_id: '', project_role: 'member' })
            setCreateMode(false)
            setNewUserForm({ name: '', email: '', password: '' })
          }
        }}
        title={editMember ? `Edit Role — ${editMember.name}` : 'Add Member'}
        width="440px"
      >
        <div className="space-y-4 mt-2">
          {/* Mode toggle — only shown when adding (not editing) */}
          {!editMember && (
            <div className="flex rounded-lg overflow-hidden border border-border text-sm">
              <button
                onClick={() => setCreateMode(false)}
                className={`flex-1 px-3 py-1.5 transition-colors ${!createMode ? 'bg-td-green text-white font-medium' : 'bg-input text-muted-foreground hover:bg-muted'}`}
              >
                Existing User
              </button>
              <button
                onClick={() => setCreateMode(true)}
                className={`flex-1 px-3 py-1.5 transition-colors ${createMode ? 'bg-td-green text-white font-medium' : 'bg-input text-muted-foreground hover:bg-muted'}`}
              >
                Create New User
              </button>
            </div>
          )}

          {/* Existing user selector */}
          {!editMember && !createMode && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</label>
              {availableUsers.length > 0 ? (
                <select
                  data-testid="member-form-user"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={memberForm.user_id}
                  onChange={(e) => setMemberForm((f) => ({ ...f, user_id: e.target.value }))}
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  All users are already members. Switch to <button onClick={() => setCreateMode(true)} className="text-td-green underline">Create New User</button> to add someone.
                </p>
              )}
            </div>
          )}

          {/* New user creation fields */}
          {!editMember && createMode && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name *</label>
                <input
                  data-testid="new-user-name"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Jane Smith"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
                <input
                  data-testid="new-user-email"
                  type="email"
                  className="mt-1 w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="jane@tdbank.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temporary Password *</label>
                <div className="relative mt-1">
                  <input
                    data-testid="new-user-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">User will be prompted to change this on first login.</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Project Role
            </label>
            <div className="flex gap-4">
              {[
                { value: 'member', label: 'Member', description: 'Can use all enabled modules and view their own jobs', icon: User },
                { value: 'admin', label: 'Admin', description: 'Can manage project members and their roles', icon: Shield, superOnly: false },
              ].map(({ value, label, description, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex-1 flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    memberForm.project_role === value
                      ? 'border-td-green bg-td-green/5'
                      : 'border-border hover:border-td-green/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="project_role"
                    value={value}
                    checked={memberForm.project_role === value}
                    onChange={() => setMemberForm((f) => ({ ...f, project_role: value }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-td-green" />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {memberForm.project_role === value && <Check className="w-3.5 h-3.5 text-td-green ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => { setShowAddMember(false); setEditMember(null) }}
            className="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="member-form-submit"
            onClick={handleSaveMember}
            disabled={
              editMember ? false :
              createMode ? (!newUserForm.name || !newUserForm.email) :
              !memberForm.user_id
            }
            className="px-4 py-2 text-sm rounded-md bg-td-green text-white font-medium hover:bg-td-dark-green transition-colors disabled:opacity-50"
          >
            {editMember ? 'Save Changes' : 'Add to Project'}
          </button>
        </div>
      </CenteredDialog>
    </div>
  )
}
