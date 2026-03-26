import { useCallback, useRef } from 'react'
import { useChatStore } from '@/store'
import { useAppStore } from '@/store'
import { getToken } from '@/lib/auth'
import { DEMO_CHAT_RESPONSES } from '@/lib/demo-data'
import api from '@/lib/api'

export function useChatSSE() {
  const { addMessage, startStreaming, appendToken, finalizeStream, lastJobType } = useChatStore()
  const demoMode = useAppStore((s) => s.demoMode)
  const esRef = useRef(null)

  const sendMessage = useCallback(
    (content) => {
      addMessage({ role: 'user', content })

      if (demoMode) {
        const response = pickDemoResponse(content, lastJobType)
        startStreaming()
        let i = 0
        const timer = setInterval(() => {
          if (i < response.length) {
            appendToken(response[i])
            i++
          } else {
            clearInterval(timer)
            finalizeStream([{ title: 'TD Bank QA Knowledge Base', url: '#' }])
          }
        }, 12)
      } else {
        const token = getToken()
        startStreaming()

        api
          .post('/api/v1/chat/', { message: content })
          .then((res) => {
            const sessionId = res.data.session_id
            const url = `${process.env.REACT_APP_BACKEND_URL}/api/v1/chat/stream/${sessionId}?token=${token}`
            const es = new EventSource(url)
            esRef.current = es

            es.onmessage = (event) => {
              const data = JSON.parse(event.data)
              if (data.type === 'token') appendToken(data.token)
              if (data.type === 'done') {
                es.close()
                finalizeStream(data.citations || [])
              }
            }
            es.onerror = () => {
              es.close()
              finalizeStream()
            }
          })
          .catch(() => {
            finalizeStream()
          })
      }
    },
    [demoMode, lastJobType, addMessage, startStreaming, appendToken, finalizeStream]
  )

  const stopStreaming = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  return { sendMessage, stopStreaming }
}

function pickDemoResponse(content, lastJobType) {
  const lower = content.toLowerCase()
  if (lower.includes('locator') || lower.includes('playwright') || lower.includes('selector')) {
    return DEMO_CHAT_RESPONSES.locator
  }
  if (lower.includes('failure') || lower.includes('root cause') || lower.includes('rca') || lower.includes('fix')) {
    return DEMO_CHAT_RESPONSES.rca
  }
  if (lower.includes('indirect') || lower.includes('blast radius') || lower.includes('impact')) {
    return DEMO_CHAT_RESPONSES.indirect
  }
  if (lower.includes('flak') || lower.includes('duplicate') || lower.includes('regression')) {
    return DEMO_CHAT_RESPONSES.flaky
  }
  if (lower.includes('edge') || lower.includes('missing') || lower.includes('coverage gap')) {
    return DEMO_CHAT_RESPONSES.edge_cases
  }
  if (lower.includes('coverage') || lower.includes('ac5') || lower.includes('acceptance')) {
    return DEMO_CHAT_RESPONSES.coverage
  }
  return DEMO_CHAT_RESPONSES.default
}
