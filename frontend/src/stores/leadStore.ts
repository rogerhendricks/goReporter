import { create } from 'zustand'
import api from '../utils/axios'

export interface Lead {
  ID: number
  name: string
  manufacturer: string
  leadModel: string
  connector: string
  polarity: string
  isMri: boolean
  CreatedAt?: string
  UpdatedAt?: string
  DeletedAt?: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface LeadState {
  leads: Lead[]
  currentLead: Lead | null
  pagination: PaginationInfo | null
  loading: boolean
  error: string | null
  fetchLeads: (page?: number, limit?: number, search?: string) => Promise<void>
  fetchLead: (id: number) => Promise<void>
  createLead: (data: Omit<Lead, 'ID'>) => Promise<Lead | undefined>
  updateLead: (id: number, data: Partial<Lead>) => Promise<Lead | undefined>
  deleteLead: (id: number) => Promise<void>
  searchLeads: (query: string) => Promise<void>
  clearError: () => void
}

export const useLeadStore = create<LeadState>((set) => ({
  leads: [],
  currentLead: null,
  pagination: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchLeads: async (page = 1, limit = 25, search = '') => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (search) params.append('search', search)
      
      const response = await api.get(`/leads/all?${params.toString()}`)
      set({ 
        leads: response.data.data, 
        pagination: response.data.pagination,
        loading: false 
      })
    } catch (error: any) {
      console.error('Error fetching devices:', error)
      set({ 
        error: error.response?.data?.error || 'Failed to fetch leads', 
        loading: false, 
        leads: [],
        pagination: null
      })
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
        leads: state.leads.map(d => d.ID === id ? updatedLead : d),
        currentLead: state.currentLead?.ID === id ? updatedLead : state.currentLead,
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
        leads: state.leads.filter(d => d.ID !== id),
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
      const response = await api.get('/leads/search', { params: { search: query } })
      set({ leads: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'No leads found', loading: false, leads: [] })
    }
  },
}))