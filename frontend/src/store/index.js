import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_MODE_DEFAULT } from '@/lib/demo-data'

// ─── App Store ─────────────────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      demoMode: DEMO_MODE_DEFAULT,
      activeProjectId: null,

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
        if (get().isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleDemo: () => set((s) => ({ demoMode: !s.demoMode })),
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    {
      name: 'qgenie-app-store',
      partialize: (state) => ({ isDark: state.isDark, demoMode: state.demoMode }),
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
