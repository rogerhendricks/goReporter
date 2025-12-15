import api from '@/utils/axios'

export interface SecurityLogQuery {
  startDate?: string
  endDate?: string
  eventType?: string
  userId?: string
  severity?: string
  page?: number
  limit?: number
}

export interface SecurityLog {
  timestamp: string
  eventType: string
  userId?: string
  username?: string
  ipAddress: string
  userAgent?: string
  path: string
  method: string
  statusCode?: number
  message: string
  severity: string
  details?: Record<string, any>
}

export const securityService = {
  async getLogs(query: SecurityLogQuery = {}) {
    const response = await api.get<{
      logs: SecurityLog[]
      total: number
      page: number
      limit: number
    }>('/admin/security-logs', { params: query })
    return response.data
  },

  async exportLogs(query: SecurityLogQuery = {}) {
    const response = await api.get('/admin/security-logs/export', {
      params: query,
      responseType: 'blob'
    })
    return response.data
  }
}