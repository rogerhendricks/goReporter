import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/lib/api'
import { buildWsUrl } from '@/utils/ws'

type UserNotificationSeverity = 'info' | 'warning' | 'error' | 'success' | string
type UserNotificationEvent = {
  type: string
  title: string
  message: string
  severity?: UserNotificationSeverity
}

function showToast(payload: UserNotificationEvent) {
  if (!payload?.title) return

  const description = payload.message
  const severity = payload.severity?.toLowerCase()

  switch (severity) {
    case 'warning':
      toast.warning(payload.title, { description })
      break
    case 'error':
      toast.error(payload.title, { description })
      break
    case 'success':
      toast.success(payload.title, { description })
      break
    case 'info':
      toast.info(payload.title, { description })
      break
    default:
      toast(payload.title, { description })
  }
}

export function useUserNotifications() {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!isInitialized) {
      return
    }

    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    const url = buildWsUrl(`${API_BASE_URL}/notifications/ws`)
    let closedByCleanup = false

    const connect = () => {
      if (wsRef.current) return

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[UserNotifications] WebSocket connected')
      }

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as UserNotificationEvent
          showToast(payload)
        } catch (error) {
          console.error('[UserNotifications] Failed to parse message:', error)
        }
      }

      ws.onclose = (evt) => {
        console.log('[UserNotifications] WebSocket closed:', evt.code, evt.reason)
        wsRef.current = null
        if (closedByCleanup) return

        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current)
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, 2000)
      }

      ws.onerror = (err) => {
        console.error('[UserNotifications] WebSocket error:', err)
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [isAuthenticated, isInitialized])
}
