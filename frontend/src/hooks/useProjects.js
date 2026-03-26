import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store'
import { DEMO_PROJECTS } from '@/lib/demo-data'
import { getUser } from '@/lib/auth'
import api from '@/lib/api'

function getAccessibleProjects(user) {
  if (!user) return []
  const role = user.role || (user.is_admin ? 'admin' : 'user')
  if (role === 'super_admin') return DEMO_PROJECTS
  if (role === 'admin') return DEMO_PROJECTS.filter((p) => p.created_by === user.id)
  // regular user
  if (user.project_access === null) return DEMO_PROJECTS
  return DEMO_PROJECTS.filter((p) => (user.project_access || []).includes(p.id))
}

export function useProjects() {
  const demoMode = useAppStore((s) => s.demoMode)

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (demoMode) return getAccessibleProjects(getUser())
      const res = await api.get('/api/v1/projects/')
      return res.data
    },
  })
}

export function useProject(projectId) {
  const demoMode = useAppStore((s) => s.demoMode)

  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (demoMode) return DEMO_PROJECTS.find((p) => p.id === projectId) || null
      const res = await api.get(`/api/v1/projects/${projectId}`)
      return res.data
    },
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const demoMode = useAppStore((s) => s.demoMode)

  return useMutation({
    mutationFn: async (data) => {
      if (demoMode) {
        const user = getUser()
        return {
          id: `proj-${Date.now()}`,
          ...data,
          member_count: 1,
          created_at: new Date().toISOString(),
          created_by: user?.id || 'unknown',
        }
      }
      const res = await api.post('/api/v1/projects/', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
