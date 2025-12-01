import axios from '@/utils/axios'

export interface TaskTemplate {
  id: number
  name: string
  description: string
  title: string
  taskDescription: string
  priority: string
  daysUntilDue?: number
  tags: any[]
}

export const taskTemplateService = {
  async getAll(): Promise<TaskTemplate[]> {
    const response = await axios.get('/api/task-templates')
    return response.data
  },

  async assignToPatient(patientId: number, templateId: number, dueDate?: string): Promise<any> {
    const response = await axios.post(`/api/task-templates/${templateId}/assign`, {
      patientId,
      dueDate
    })
    return response.data
  }
}