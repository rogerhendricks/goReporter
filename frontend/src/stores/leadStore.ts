import { create } from 'zustand'
import api from '../utils/axios'

interface Lead {
  id: number
  name: string
  manufacturer: string
  model: string
  type: string
  isMri: boolean
}

interface LeadState {
  leads: Lead[]
  currentLead: Lead | null
  loading: boolean
  error: string | null
  fetchLeads: () => Promise<void>
  fetchLead: (id: number) => Promise<void>
  createLead: (data: Omit<Lead, 'id'>) => Promise<Lead | undefined>
  updateLead: (id: number, data: Partial<Lead>) => Promise<Lead | undefined>
  deleteLead: (id: number) => Promise<void>
  searchLeads: (query: string) => Promise<void>
  clearError: () => void
}

export const useLeadStore = create<LeadState>((set) => ({
  leads: [],
  currentLead: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchLeads: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/leads/all')
      set({ leads: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch leads', loading: false, leads: [] })
    }
  },

  fetchLead: async (id: number) => {
    set({ loading: true, error: null, currentLead: null })
    try {
      const response = await api.get(`/leads/${id}`)
      set({ currentLead: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch lead', loading: false })
    }
  },

  createLead: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/leads', data)
      const newLead = response.data
      set(state => ({
        Leads: [newLead, ...state.leads],
        loading: false
      }))
      return newLead
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create lead', loading: false })
      throw error
    }
  },

  updateLead: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put(`/leads/${id}`, data)
      const updatedLead = response.data
      set(state => ({
        Leads: state.leads.map(d => d.id === id ? updatedLead : d),
        currentLead: state.currentLead?.id === id ? updatedLead : state.currentLead,
        loading: false
      }))
      return updatedLead
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update lead', loading: false })
      throw error
    }
  },

  deleteLead: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/leads/${id}`)
      set(state => ({
        leads: state.leads.filter(d => d.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete lead', loading: false })
      throw error
    }
  },

  searchLeads: async (query) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/leads', { params: { search: query } })
      set({ leads: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'No leads found', loading: false, leads: [] })
    }
  },
}))