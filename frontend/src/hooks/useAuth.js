import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, getToken, setAuth, clearAuth } from '@/lib/auth'
import { useAppStore } from '@/store'
import { DEMO_USERS, DEMO_PROJECTS } from '@/lib/demo-data'
import api from '@/lib/api'

export function useAuth() {
  const [user, setUser] = useState(getUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { demoMode, setDemoMode } = useAppStore()

  const role = user?.role || (user?.is_admin ? 'admin' : 'user')
  const isSuperAdmin = role === 'super_admin'
  // isAdmin is true for both super_admin and admin roles
  const isAdmin = role === 'admin' || role === 'super_admin'

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      let loggedInUser
      if (demoMode) {
        const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
        if (!demoUser) throw new Error('Invalid email or password')
        const token = `demo-token-${Date.now()}`
        setAuth(token, {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          is_admin: demoUser.is_admin,
          project_access: demoUser.project_access,
        })
        loggedInUser = getUser()
      } else {
        try {
          const form = new URLSearchParams({ username: email, password })
          const res = await api.post('/api/v1/auth/login', form.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          setAuth(res.data.access_token, res.data.user)
          loggedInUser = getUser()
        } catch {
          // Fallback: check demo credentials
          const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
          if (!demoUser) throw new Error('Invalid email or password')
          const token = `demo-token-${Date.now()}`
          setAuth(token, {
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
            is_admin: demoUser.is_admin,
            project_access: demoUser.project_access,
          })
          loggedInUser = getUser()
        }
      }
      // Only super_admin can have demo mode on
      const loggedRole = loggedInUser?.role || (loggedInUser?.is_admin ? 'admin' : 'user')
      if (loggedRole !== 'super_admin') {
        setDemoMode(false)
      }
      setUser(loggedInUser)
      navigate('/projects')
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    if (!demoMode) {
      api.post('/api/v1/auth/logout').catch(() => {})
    }
    clearAuth()
    setUser(null)
    navigate('/login')
  }

  const canAccessProject = (id) => {
    if (!user) return false
    const r = user.role || (user.is_admin ? 'admin' : 'user')
    // Super admin sees all projects
    if (r === 'super_admin') return true
    // Admin can access projects they created or were assigned by superadmin
    if (r === 'admin') {
      if ((user.project_access || []).includes(id)) return true
      const project = DEMO_PROJECTS.find((p) => p.id === id)
      return project?.created_by === user.id
    }
    // Regular user: check project_access list
    if (user.project_access === null) return true
    return (user.project_access || []).includes(id)
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    role,
    isSuperAdmin,
    isAdmin,
    isAuthenticated: !!getToken(),
    canAccessProject,
  }
}
