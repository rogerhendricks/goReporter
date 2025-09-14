import { create } from 'zustand'
import api from '../utils/axios'

interface Address {
  id?: number
  street: string
  city: string
  state: string
  country: string
  zip: string
}

export interface Doctor {
  id: number
  fullName: string
  email: string
  phone: string
  addresses: Address[]
  patients?: any[]
}

interface DoctorState {
  doctors: Doctor[]
  currentDoctor: Doctor | null
  loading: boolean
  error: string | null
  fetchDoctors: () => Promise<void>
  fetchDoctor: (id: number) => Promise<void>
  createDoctor: (data: Partial<Doctor>) => Promise<Doctor | undefined>
  updateDoctor: (id: number, data: Partial<Doctor>) => Promise<Doctor | undefined>
  deleteDoctor: (id: number) => Promise<void>
  searchDoctors: (query: string) => Promise<Doctor []>
  clearError: () => void
}

export const useDoctorStore = create<DoctorState>((set) => ({
  doctors: [],
  currentDoctor: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchDoctors: async () => {
    set({ loading: true, error: null })
    try {
      console.log('Fetching doctors with addresses...')
      const response = await api.get('/doctors/all')
      console.log('Doctors response:', response.data)
      
      const doctorsData = Array.isArray(response.data) ? response.data : []
      set({ doctors: doctorsData, loading: false })
    } catch (error: any) {
      console.error('Error fetching doctors:', error)
      set({ 
        error: error.response?.data?.error || 'Failed to fetch doctors', 
        loading: false,
        doctors: []
      })
    }
  },

  fetchDoctor: async (id: number) => {
    set({ loading: true, error: null })
    try {
      console.log(`Fetching doctor ${id} with addresses...`)
      const response = await api.get(`/doctors/${id}`)
      console.log('Doctor response:', response.data)
      set({ currentDoctor: response.data, loading: false })
    } catch (error: any) {
      console.error('Error fetching doctor:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch doctor', loading: false })
    }
  },

  createDoctor: async (data: Partial<Doctor>) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/doctors', data)
      const newDoctor = response.data
      set(state => ({
        doctors: [newDoctor, ...state.doctors],
        loading: false
      }))
      return newDoctor
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create doctor', loading: false })
      throw error
    }
  },

  updateDoctor: async (id: number, data: Partial<Doctor>) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put(`/doctors/${id}`, data)
      const updatedDoctor = response.data
      set(state => ({
        doctors: state.doctors.map(d => d.id === id ? updatedDoctor : d),
        currentDoctor: state.currentDoctor?.id === id ? updatedDoctor : state.currentDoctor,
        loading: false
      }))
      return updatedDoctor
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update doctor', loading: false })
      throw error
    }
  },

  deleteDoctor: async (id: number) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/doctors/${id}`)
      set(state => ({
        doctors: state.doctors.filter(d => d.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete doctor', loading: false })
      throw error
    }
  },

  // searchDoctors: async (query: string) => {
  //   try {
  //     const response = await api.get('/doctors', { params: { search: query } })
  //     return response.data
  //   } catch (error) {
  //     console.error('Error searching doctors:', error)
  //     return []
  //   }
  // }
  
  searchDoctors: async (query: string): Promise<Doctor[]> => { // changed
    set({ loading: true, error: null })
    try {
      console.log(`Searching doctors with query: ${query}`)
      const response = await api.get('/doctors/search', { 
        params: { search: query } 
      })
      console.log('Search doctors response:', response.data)
      const doctorsData: Doctor[] = Array.isArray(response.data) ? response.data : []
      set({ doctors: doctorsData, loading: false })
      return doctorsData // return results
    } catch (error: any) {
      console.error('Error searching doctors:', error)
      set({
        error: error.response?.data?.error || 'Failed to search doctors',
        loading: false,
        doctors: []
      })
      return [] // ensure Promise<Doctor[]> on error
    }
  }
}))