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
  actionUrl?: string
  accessRequestId?: number
}

const MAX_QUEUE = 5

function getQueueKey(userId: number | string) {
  return `toastQueue:${userId}`
}

function readQueue(key: string): UserNotificationEvent[] {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as UserNotificationEvent[]
  } catch {
    return []
  }
}

function writeQueue(key: string, items: UserNotificationEvent[]) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(items))
  } catch {
    // ignore
  }
}

function enqueue(key: string, evt: UserNotificationEvent) {
  const items = readQueue(key)
  items.push(evt)
  const pruned = items.slice(Math.max(0, items.length - MAX_QUEUE))
  writeQueue(key, pruned)
}

function clearQueue(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function showToast(payload: UserNotificationEvent) {
  if (!payload?.title) return

  const description = payload.message
  const severity = payload.severity?.toLowerCase()

  const action = payload.actionUrl
    ? {
        label: 'View',
        onClick: () => {
          window.location.href = payload.actionUrl!
        }
      }
    : undefined

  switch (severity) {
    case 'warning':
      toast.warning(payload.title, { description, action })
      break
    case 'error':
      toast.error(payload.title, { description, action })
      break
    case 'success':
      toast.success(payload.title, { description, action })
      break
    case 'info':
      toast.info(payload.title, { description, action })
      break
    default:
      toast(payload.title, { description, action })
  }
}

export function useUserNotifications() {
  const { isAuthenticated, isInitialized, user } = useAuthStore()
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

    const userId = user?.ID
    const queueKey = userId ? getQueueKey(userId) : null

    const flushQueue = () => {
      if (!queueKey) return
      const items = readQueue(queueKey)
      if (items.length === 0) return
      clearQueue(queueKey)
      for (const item of items) {
        showToast(item)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        flushQueue()
      }
    }

    const connect = () => {
      if (wsRef.current) return

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[UserNotifications] WebSocket connected')

        // Flush any queued notifications as soon as we're connected
        flushQueue()
      }

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as UserNotificationEvent
          // Fallback: if tab isn't visible, queue and flush when visible.
          if (queueKey && document.visibilityState !== 'visible') {
            enqueue(queueKey, payload)
            return
          }
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

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      closedByCleanup = true

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [isAuthenticated, isInitialized, user])
}
