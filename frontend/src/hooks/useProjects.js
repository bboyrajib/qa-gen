import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store'
import { DEMO_PROJECTS } from '@/lib/demo-data'
import api from '@/lib/api'

export function useProjects() {
  const demoMode = useAppStore((s) => s.demoMode)

  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (demoMode) return DEMO_PROJECTS
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
        return { id: `proj-${Date.now()}`, ...data, member_count: 1, created_at: new Date().toISOString() }
      }
      const res = await api.post('/api/v1/projects/', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
