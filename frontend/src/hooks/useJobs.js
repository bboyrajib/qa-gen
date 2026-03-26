import { useCallback } from 'react'
import { useJobStore, useAppStore } from '@/store'

export function useJobSimulator() {
  const { createJob, updateStep, setJobComplete, setJobFailed } = useJobStore()
  const activeProjectId = useAppStore((s) => s.activeProjectId)

  const simulate = useCallback(
    (steps, options = {}) => {
      const { delay = 750, type = 'demo', onComplete, onFail, triggeredBy } = options
      const jobId = `${type}-${Date.now()}`
      createJob(jobId, type)

      let i = 0
      const next = () => {
        if (i > 0) updateStep(jobId, steps[i - 1], 'complete')
        if (i < steps.length) {
          updateStep(jobId, steps[i], 'running')
          i++
          setTimeout(next, delay)
        } else {
          setJobComplete(jobId, { done: true })
          if (onComplete) onComplete(jobId)
          // Dispatch notification
          if (activeProjectId) {
            import('@/store').then(({ useNotificationStore }) => {
              useNotificationStore.getState().addNotification({
                jobId,
                type,
                status: 'COMPLETE',
                projectId: activeProjectId,
                triggeredBy: triggeredBy || 'You',
              })
            })
          }
        }
      }
      next()
      return jobId
    },
    [createJob, updateStep, setJobComplete, activeProjectId]
  )

  return { simulate }
}

import { useQuery, useMutation } from '@tanstack/react-query'
import { DEMO_RECENT_JOBS } from '@/lib/demo-data'
import api from '@/lib/api'

export function useRecentJobs(projectId) {
  const demoMode = useAppStore((s) => s.demoMode)

  return useQuery({
    queryKey: ['jobs', projectId],
    queryFn: async () => {
      if (demoMode) {
        return DEMO_RECENT_JOBS.filter((j) => j.project_id === projectId)
      }
      const res = await api.get(`/api/v1/jobs/?project_id=${projectId}&limit=10`)
      return res.data
    },
    enabled: !!projectId,
  })
}

export function useAllRecentJobs() {
  const demoMode = useAppStore((s) => s.demoMode)

  return useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: async () => {
      if (demoMode) return DEMO_RECENT_JOBS
      const res = await api.get('/api/v1/jobs/?limit=5')
      return res.data
    },
  })
}
