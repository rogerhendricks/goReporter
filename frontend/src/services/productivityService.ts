import axios from '@/utils/axios'

export interface TasksByPriority {
  urgent: number
  high: number
  medium: number
  low: number
}

export interface TasksByStatus {
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface PatientTaskSummary {
  patientId: number
  patientName: string
  taskCount: number
}

export interface ProductivityReport {
  userId: number
  username: string
  fullName: string
  role: string
  startDate: string
  endDate: string
  totalTasksCompleted: number
  tasksByPriority: TasksByPriority
  tasksByStatus: TasksByStatus
  tasksCreated: number
  averageCompletionTime: number // in hours
  onTimeCompletions: number
  lateCompletions: number
  topPatients: PatientTaskSummary[]
  // Report metrics
  reportsCompleted: number
  reportsCreated: number
  reportsPending: number
}

export interface UserPerformanceSummary {
  userId: number
  username: string
  fullName: string
  totalTasksCompleted: number
  onTimeRate: number // percentage
}

export interface TeamProductivityReport {
  managerId: number
  managerName: string
  startDate: string
  endDate: string
  teamMembers: ProductivityReport[]
  totalTasksCompleted: number
  totalTasksCreated: number
  teamAverageCompletionTime: number
  topPerformers: UserPerformanceSummary[]
  // Report metrics
  totalReportsCompleted: number
  totalReportsCreated: number
  totalReportsPending: number
}

export interface ProductivityReportParams {
  startDate?: string
  endDate?: string
}

export const productivityService = {
  /**
   * Get productivity report for the authenticated user
   */
  async getMyReport(params?: ProductivityReportParams): Promise<ProductivityReport> {
    const response = await axios.get('/productivity/my-report', { params })
    return response.data
  },

  /**
   * Get team productivity report (for managers/admins)
   */
  async getTeamReport(params?: ProductivityReportParams): Promise<TeamProductivityReport> {
    const response = await axios.get('/productivity/team-report', { params })
    return response.data
  },

  /**
   * Get productivity report for a specific user (admin only)
   */
  async getUserReport(userId: number, params?: ProductivityReportParams): Promise<ProductivityReport> {
    const response = await axios.get(`/productivity/users/${userId}/report`, { params })
    return response.data
  },

  /**
   * Get productivity report for a specific team
   */
  async getTeamProductivity(teamId: number, params?: ProductivityReportParams): Promise<TeamProductivityReport> {
    const response = await axios.get(`/productivity/teams/${teamId}`, { params })
    return response.data
  },

  /**
   * Get productivity reports for all teams
   */
  async getAllTeamsProductivity(params?: ProductivityReportParams): Promise<TeamProductivityReport[]> {
    const response = await axios.get('/productivity/teams', { params })
    return response.data
  }
}
