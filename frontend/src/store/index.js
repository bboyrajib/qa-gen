import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_MODE_DEFAULT, DEMO_RECENT_JOBS } from '@/lib/demo-data'
import { showBrowserNotification } from '@/lib/utils'

const DEFAULT_MODULES = {
  tosca: true, 'test-gen': true, rca: true, impact: true, regression: true,
}

const SEED_NOTIFICATIONS = DEMO_RECENT_JOBS.map((job) => ({
  id: `notif-${job.id}`,
  jobId: job.id,
  type: job.type,
  status: job.status,
  projectId: job.project_id,
  triggeredBy: job.user,
  timestamp: job.submitted,
  read: false,
}))

// ─── App Store ─────────────────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      demoMode: DEMO_MODE_DEFAULT,
      activeProjectId: null,
      projectModules: {},

      toggleDark: () => {
        const newVal = !get().isDark
        set({ isDark: newVal })
        if (newVal) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      initTheme: () => {
        const isDark = get().isDark
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleDemo: () => set((s) => ({ demoMode: !s.demoMode })),
      setActiveProjectId: (id) => set({ activeProjectId: id }),

      getProjectModules: (projectId) => {
        const stored = get().projectModules[projectId]
        return stored ? { ...DEFAULT_MODULES, ...stored } : { ...DEFAULT_MODULES }
      },
      setModuleEnabled: (projectId, moduleKey, enabled) => set((s) => ({
        projectModules: {
          ...s.projectModules,
          [projectId]: {
            ...DEFAULT_MODULES,
            ...(s.projectModules[projectId] || {}),
            [moduleKey]: enabled,
          },
        },
      })),
    }),
    {
      name: 'qgenie-app-store',
      partialize: (s) => ({ isDark: s.isDark, demoMode: s.demoMode, projectModules: s.projectModules }),
    }
  )
)

// ─── Notification Store ────────────────────────────────────────────────────────
export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: SEED_NOTIFICATIONS,

      addNotification: (n) => {
        const notification = {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          read: false,
          timestamp: n.timestamp || new Date().toISOString(),
        }
        set((s) => ({ notifications: [notification, ...s.notifications] }))
        if (n.status === 'COMPLETE') {
          showBrowserNotification(
            `Job Complete — ${n.type}`,
            `Job ${n.jobId} finished successfully. Triggered by ${n.triggeredBy || 'You'}.`
          )
        } else if (n.status === 'FAILED') {
          showBrowserNotification(
            `Job Failed — ${n.type}`,
            `Job ${n.jobId} failed. Triggered by ${n.triggeredBy || 'You'}.`
          )
        }
      },

      markAllRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),

      dismissAll: () => set({ notifications: [] }),

      getProjectNotifications: (projectId) =>
        get().notifications.filter((n) => n.projectId === projectId),

      getUnreadCount: (projectId) =>
        get().notifications.filter((n) => n.projectId === projectId && !n.read).length,
    }),
    {
      name: 'qgenie-notifications',
      partialize: (s) => ({ notifications: s.notifications }),
    }
  )
)

// ─── Job Store ─────────────────────────────────────────────────────────────────
export const useJobStore = create((set, get) => ({
  activeJobId: null,
  jobs: {},

  createJob: (jobId, type) => set((s) => ({
    activeJobId: jobId,
    jobs: {
      ...s.jobs,
      [jobId]: { type, steps: {}, complete: false, failed: false, result: null, error: null, createdAt: Date.now() },
    },
  })),

  updateStep: (jobId, stepName, status) => set((s) => ({
    jobs: {
      ...s.jobs,
      [jobId]: {
        ...s.jobs[jobId],
        steps: { ...(s.jobs[jobId]?.steps || {}), [stepName]: status },
      },
    },
  })),

  setJobComplete: (jobId, result) => set((s) => ({
    jobs: {
      ...s.jobs,
      [jobId]: { ...s.jobs[jobId], complete: true, result },
    },
  })),

  setJobFailed: (jobId, message) => set((s) => ({
    jobs: {
      ...s.jobs,
      [jobId]: { ...s.jobs[jobId], failed: true, error: message },
    },
  })),

  getJob: (jobId) => get().jobs[jobId],
}))

// ─── Chat Store ────────────────────────────────────────────────────────────────
export const useChatStore = create((set) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  lastJobType: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: Date.now() + Math.random() }] })),
  startStreaming: () => set({ isStreaming: true, streamingContent: '' }),
  appendToken: (token) => set((s) => ({ streamingContent: s.streamingContent + token })),
  finalizeStream: (citations = []) => set((s) => ({
    messages: [
      ...s.messages,
      { id: Date.now() + Math.random(), role: 'assistant', content: s.streamingContent, citations },
    ],
    isStreaming: false,
    streamingContent: '',
  })),
  setLastJobType: (type) => set({ lastJobType: type }),
  clearMessages: () => set({ messages: [], streamingContent: '', isStreaming: false }),
}))
