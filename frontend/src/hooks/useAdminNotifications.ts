import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/lib/api'

type AdminNotificationEvent = {
  type: string
  title: string
  message: string
  taskId?: number
  reportId?: number
  completedBy?: string
}

function getWsUrl(path: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}${path}`
}

export function useAdminNotifications() {
  const { isAuthenticated, isInitialized, user } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  // Compute isAdmin directly from user role
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  useEffect(() => {
    console.log('[AdminNotifications] Hook effect running:', {
      isInitialized,
      isAuthenticated,
      isAdmin,
      userRole: user?.role
    })

    if (!isInitialized) {
      console.log('[AdminNotifications] Not initialized yet, skipping')
      return
    }

    if (!isAuthenticated || !isAdmin) {
      console.log('[AdminNotifications] Not authenticated or not admin, closing connection')
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    const url = getWsUrl(`${API_BASE_URL}/admin/notifications/ws`)

    let closedByCleanup = false

    const connect = () => {
      if (wsRef.current) return

      console.log('[AdminNotifications] Connecting to:', url)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[AdminNotifications] WebSocket connected')
      }

      ws.onmessage = (evt) => {
        console.log('[AdminNotifications] Received:', evt.data)
        try {
          const payload = JSON.parse(evt.data) as AdminNotificationEvent
          if (!payload?.title) return
          toast(payload.title, { description: payload.message })
        } catch (err) {
          console.error('[AdminNotifications] Failed to parse message:', err)
        }
      }

      ws.onclose = (evt) => {
        console.log('[AdminNotifications] WebSocket closed:', evt.code, evt.reason)
        wsRef.current = null
        if (closedByCleanup) return

        // basic reconnect loop
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current)
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, 1500)
      }

      ws.onerror = (err) => {
        console.error('[AdminNotifications] WebSocket error:', err)
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
  }, [isAuthenticated, isAdmin, isInitialized, user])
}
