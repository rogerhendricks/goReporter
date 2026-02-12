import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { API_BASE_URL } from '@/lib/api'
import { buildWsUrl } from '@/utils/ws'
type AdminNotificationEvent = {
  type: string
  title: string
  message: string
  actionUrl?: string
  accessRequestId?: number
  taskId?: number
  reportId?: number
  completedBy?: string
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

    const url = buildWsUrl(`${API_BASE_URL}/admin/notifications/ws`)

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
          
          // Skip notifications for actions performed by the current user
          if (payload.completedBy && user?.username && payload.completedBy === user.username) {
            console.log('[AdminNotifications] Skipping self-notification')
            return
          }
          
          const action = payload.actionUrl
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = payload.actionUrl!
                }
              }
            : undefined

          toast(payload.title, { description: payload.message, action })
        } catch (err) {
          console.error('[AdminNotifications] Failed to parse message:', err)
        }
      }

      ws.onclose = (evt) => {
        console.log('[AdminNotifications] WebSocket closed:', evt.code, evt.reason)
        wsRef.current = null
        if (closedByCleanup) return

        // Basic reconnect loop
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
