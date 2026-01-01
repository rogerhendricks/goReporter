import api from '@/utils/axios'

export interface Team {
  id: number
  name: string
  description?: string
  color?: string
  managerId?: number
  manager?: {
    id: number
    username: string
    fullName: string
  }
  members: TeamMember[]
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  ID: number
  username: string
  fullName: string
  email: string
  role: string
}

export interface CreateTeamRequest {
  name: string
  description?: string
  color?: string
  managerId?: number
  memberIds: number[]
}

export interface UpdateTeamRequest {
  name: string
  description?: string
  color?: string
  managerId?: number
  memberIds: number[]
}

export const teamService = {
  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    const response = await api.get('/teams')
    return response.data
  },

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: number): Promise<Team> {
    const response = await api.get(`/teams/${teamId}`)
    return response.data
  },

  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamRequest): Promise<Team> {
    const response = await api.post('/teams', data)
    return response.data
  },

  /**
   * Update an existing team
   */
  async updateTeam(teamId: number, data: UpdateTeamRequest): Promise<Team> {
    const response = await api.put(`/teams/${teamId}`, data)
    return response.data
  },

  /**
   * Delete a team
   */
  async deleteTeam(teamId: number): Promise<void> {
    await api.delete(`/teams/${teamId}`)
  },

  /**
   * Add members to a team
   */
  async addMembers(teamId: number, memberIds: number[]): Promise<Team> {
    const response = await api.post(`/teams/${teamId}/members`, { memberIds })
    return response.data
  },

  /**
   * Remove members from a team
   */
  async removeMembers(teamId: number, memberIds: number[]): Promise<Team> {
    const response = await api.delete(`/teams/${teamId}/members`, { data: { memberIds } })
    return response.data
  }
}
