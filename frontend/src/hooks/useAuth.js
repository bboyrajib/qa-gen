import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, getToken, setAuth, clearAuth } from '@/lib/auth'
import { useAppStore } from '@/store'
import { DEMO_USERS } from '@/lib/demo-data'
import api from '@/lib/api'

export function useAuth() {
  const [user, setUser] = useState(getUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { demoMode, setDemoMode } = useAppStore()

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      let loggedInUser
      if (demoMode) {
        // Admin has demo mode ON — use demo credentials
        const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
        if (!demoUser) throw new Error('Invalid email or password')
        const token = `demo-token-${Date.now()}`
        setAuth(token, {
          email: demoUser.email,
          name: demoUser.name,
          is_admin: demoUser.is_admin,
          project_access: demoUser.project_access,
        })
        loggedInUser = getUser()
      } else {
        // Try real API; fall back to demo credentials (for development)
        try {
          const form = new URLSearchParams({ username: email, password })
          const res = await api.post('/api/v1/auth/login', form.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          setAuth(res.data.access_token, res.data.user)
          loggedInUser = getUser()
        } catch {
          // Fallback: check demo credentials (allows dev/test without backend)
          const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password)
          if (!demoUser) throw new Error('Invalid email or password')
          const token = `demo-token-${Date.now()}`
          setAuth(token, {
            email: demoUser.email,
            name: demoUser.name,
            is_admin: demoUser.is_admin,
            project_access: demoUser.project_access,
          })
          loggedInUser = getUser()
        }
      }
      // Non-admins cannot use demo mode
      if (!loggedInUser?.is_admin) {
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
    if (user.is_admin) return true
    if (user.project_access === null) return true
    return user.project_access.includes(id)
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin: user?.is_admin === true,
    isAuthenticated: !!getToken(),
    canAccessProject,
  }
}
