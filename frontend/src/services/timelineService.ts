import api from '../utils/axios'
import type { Task } from '@/stores/taskStore'
import type { PatientNote } from './patientNoteService'
import type { Report } from '@/stores/reportStore'

export interface TimelineEvent {
  id: string
  type: 'task' | 'note' | 'report'
  date: string
  data: Task | PatientNote | Report
}

export interface TimelineResponse {
  events: TimelineEvent[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export interface TimelineStats {
  taskCount: number
  noteCount: number
  reportCount: number
}

export interface TimelineFilters {
  page?: number
  limit?: number
  type?: 'all' | 'task' | 'note' | 'report'
  startDate?: string // YYYY-MM-DD format
  endDate?: string   // YYYY-MM-DD format
}

export const timelineService = {
  getPatientTimeline: async (
    patientId: number, 
    filters: TimelineFilters = {}
  ): Promise<TimelineResponse> => {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 20,
    }

    if (filters.type && filters.type !== 'all') {
      params.type = filters.type
    }

    if (filters.startDate) {
      params.startDate = filters.startDate
    }

    if (filters.endDate) {
      params.endDate = filters.endDate
    }

    const response = await api.get<TimelineResponse>(
      `/patients/${patientId}/timeline`,
      { params }
    )

    return response.data
  },

  getPatientTimelineStats: async (patientId: number): Promise<TimelineStats> => {
    const response = await api.get<TimelineStats>(
      `/patients/${patientId}/timeline/stats`
    )
    return response.data
  }
}
