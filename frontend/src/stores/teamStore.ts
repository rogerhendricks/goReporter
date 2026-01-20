import { create } from 'zustand'
import { teamService, type Team } from '@/services/teamService'

interface TeamState {
  teams: Team[]
  loading: boolean
  error: string | null
  fetchTeams: () => Promise<void>
  clearError: () => void
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  loading: false,
  error: null,

  fetchTeams: async () => {
    // Avoid duplicate fetches if already loading or if we have data
    if (get().loading || (get().teams.length > 0)) {
      return
    }

    set({ loading: true, error: null })
    try {
      const teams = await teamService.getAllTeams()
      set({ teams, loading: false })
    } catch (error: any) {
      console.error('Failed to fetch teams:', error)
      set({ error: error.message || 'Failed to load teams', loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
