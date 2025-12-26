import api from '../utils/axios'

export interface Webhook {
  id: number
  name: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  description?: string
  createdBy?: number
  integrationType?: string  // 'generic', 'epic', 'slack', 'teams'
  epicClientId?: string
  epicPrivateKey?: string
  epicTokenUrl?: string
  epicFhirBase?: string
  lastTriggeredAt?: string
  successCount: number
  failureCount: number
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: number
  webhookId: number
  event: string
  payload: string
  statusCode: number
  response: string
  success: boolean
  errorMessage?: string
  duration: number
  createdAt: string
}

export interface CreateWebhookRequest {
  name: string
  url: string
  events: string[]
  secret?: string
  description?: string
  active?: boolean
  integrationType?: string
  epicClientId?: string
  epicPrivateKey?: string
  epicTokenUrl?: string
  epicFhirBase?: string
}

export const webhookService = {
  async getAll(): Promise<Webhook[]> {
    const response = await api.get('/webhooks')
    return response.data
  },

  async getById(id: number): Promise<Webhook> {
    const response = await api.get(`/webhooks/${id}`)
    return response.data
  },

  async create(data: CreateWebhookRequest): Promise<Webhook> {
    const response = await api.post('/webhooks', data)
    return response.data
  },

  async update(id: number, data: Partial<CreateWebhookRequest>): Promise<Webhook> {
    const response = await api.put(`/webhooks/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/webhooks/${id}`)
  },

  async test(id: number): Promise<{ message: string }> {
    const response = await api.post(`/webhooks/${id}/test`)
    return response.data
  },

  async getDeliveries(id: number, limit = 50, offset = 0): Promise<{
    deliveries: WebhookDelivery[]
    total: number
    limit: number
    offset: number
  }> {
    const response = await api.get(`/webhooks/${id}/deliveries`, {
      params: { limit, offset }
    })
    return response.data
  }
}

export const AVAILABLE_EVENTS = [
  { value: 'report.created', label: 'Report Created', description: 'When a new report is created' },
  { value: 'report.completed', label: 'Report Completed', description: 'When a report is marked as completed' },
  { value: 'report.reviewed', label: 'Report Reviewed', description: 'When a report is reviewed' },
  { value: 'battery.low', label: 'Battery Low', description: 'When battery is below 20%' },
  { value: 'battery.critical', label: 'Battery Critical', description: 'When battery status is ERI/EOL' },
  { value: 'task.created', label: 'Task Created', description: 'When a new task is created' },
  { value: 'task.due', label: 'Task Due', description: 'When a task is due today' },
  { value: 'task.overdue', label: 'Task Overdue', description: 'When a task becomes overdue' },
  { value: 'task.completed', label: 'Task Completed', description: 'When a task is completed' },
  { value: 'consent.expiring', label: 'Consent Expiring', description: 'When consent expires within 30 days' },
  { value: 'consent.expired', label: 'Consent Expired', description: 'When consent has expired' },
  { value: 'device.implanted', label: 'Device Implanted', description: 'When a device is implanted' },
  { value: 'device.explanted', label: 'Device Explanted', description: 'When a device is explanted' },
]
