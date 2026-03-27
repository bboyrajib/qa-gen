import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, getToken, setAuth, clearAuth } from '@/lib/auth'
import { useAppStore } from '@/store'
import { DEMO_USERS, DEMO_PROJECTS } from '@/lib/demo-data'
import api from '@/lib/api'
import { toast } from 'sonner'

export function useAuth() {
  const [user, setUser] = useState(getUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // True after a successful login when the account has must_change_password=true.
  // While true, login() has called setAuth (token in localStorage) but hasn't navigated —
  // LoginPage renders step-2 in place of the sign-in form.
  const [mustSetPassword, setMustSetPassword] = useState(false)
  const navigate = useNavigate()
  const { demoMode, setDemoMode } = useAppStore()

  const role = user?.role || (user?.is_admin ? 'admin' : 'user')
  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || role === 'super_admin'

  // ── helpers ──────────────────────────────────────────────────────────────────

  const _setUserAndRole = (loggedInUser) => {
    const loggedRole = loggedInUser?.role || (loggedInUser?.is_admin ? 'admin' : 'user')
    if (loggedRole !== 'super_admin') setDemoMode(false)
    setUser(loggedInUser)
  }

  // ── login ────────────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      if (demoMode) {
        const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
        if (!demoUser) throw new Error('Invalid email or password')
        const token = `demo-token-${Date.now()}`
        const userObj = {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          is_admin: demoUser.is_admin,
          project_access: demoUser.project_access,
          must_change_password: demoUser.must_change_password || false,
        }
        setAuth(token, userObj)
        const loggedInUser = getUser()
        _setUserAndRole(loggedInUser)
        if (userObj.must_change_password) {
          setMustSetPassword(true)
          return // stay on login page — step 2 will render
        }
        navigate('/projects')
        return
      }

      // Real API path (with demo fallback)
      try {
        const form = new URLSearchParams({ username: email, password })
        const res = await api.post('/api/v1/auth/login', form.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        setAuth(res.data.access_token, res.data.user)
        const loggedInUser = getUser()
        _setUserAndRole(loggedInUser)
        if (res.data.user.must_change_password) {
          setMustSetPassword(true)
          return
        }
        navigate('/projects')
        return
      } catch {
        // Fallback to demo credentials
        const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
        if (!demoUser) throw new Error('Invalid email or password')
        const token = `demo-token-${Date.now()}`
        const userObj = {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          is_admin: demoUser.is_admin,
          project_access: demoUser.project_access,
          must_change_password: demoUser.must_change_password || false,
        }
        setAuth(token, userObj)
        const loggedInUser = getUser()
        _setUserAndRole(loggedInUser)
        if (userObj.must_change_password) {
          setMustSetPassword(true)
          return
        }
        navigate('/projects')
      }
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  // ── first-login password setup (called from LoginPage step 2) ────────────────

  const completePasswordSetup = async (newPassword) => {
    // Token is already in localStorage from login(), so api instance will include it.
    // Backend skips current_password check when must_change_password=true.
    if (!demoMode) {
      try {
        await api.post('/api/v1/auth/change-password', { new_password: newPassword })
      } catch (e) {
        throw new Error(e?.response?.data?.detail || 'Failed to set password')
      }
    }
    // Update stored user to clear the flag
    const updated = { ...getUser(), must_change_password: false }
    setAuth(getToken(), updated)
    setUser(updated)
    setMustSetPassword(false)
    toast.success('Password set — welcome to QGenie!')
    navigate('/projects')
  }

  // ── change password (for already-logged-in users) ────────────────────────────

  const changePassword = async (currentPassword, newPassword) => {
    if (demoMode) {
      const updated = { ...getUser(), must_change_password: false }
      setAuth(getToken(), updated)
      setUser(updated)
      toast.success('Password changed successfully')
      return
    }
    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      const updated = { ...getUser(), must_change_password: false }
      setAuth(getToken(), updated)
      setUser(updated)
      toast.success('Password changed successfully')
    } catch (e) {
      throw new Error(e?.response?.data?.detail || 'Failed to change password')
    }
  }

  // ── logout ───────────────────────────────────────────────────────────────────

  const logout = () => {
    if (!demoMode) {
      api.post('/api/v1/auth/logout').catch(() => {})
    }
    clearAuth()
    setUser(null)
    setMustSetPassword(false)
    navigate('/login')
  }

  // ── project access check ─────────────────────────────────────────────────────

  const canAccessProject = (id) => {
    if (!user) return false
    const r = user.role || (user.is_admin ? 'admin' : 'user')
    if (r === 'super_admin') return true
    if (r === 'admin') {
      if ((user.project_access || []).includes(id)) return true
      const project = DEMO_PROJECTS.find((p) => p.id === id)
      return project?.created_by === user.id
    }
    if (user.project_access === null) return true
    return (user.project_access || []).includes(id)
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    completePasswordSetup,
    mustSetPassword,
    mustChangePassword: !!user?.must_change_password,
    role,
    isSuperAdmin,
    isAdmin,
    isAuthenticated: !!getToken(),
    canAccessProject,
  }
}
