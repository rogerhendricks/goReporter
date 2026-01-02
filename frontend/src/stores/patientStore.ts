import { create } from 'zustand'
import api from '../utils/axios'
import { toast } from 'sonner'
import type { Report } from './reportStore' 
import type { Tag } from '../services/tagService'


export interface Doctor {
  id: number
  fullName: string
  email: string
  phone: string
  addresses?: Address[]
}

export interface Address {
  id: number
  street: string
  city: string
  state: string
  country: string
  zip: string
}

export interface PatientDoctor {
  id?: number
  doctorId: number
  addressId?: number | null
  isPrimary: boolean
  doctor: Doctor
  address?: Address | null
}

export interface Device {
  ID: number;
  name: string;
  manufacturer: string;
  model: string;
}

export interface Lead {
  ID: number;
  name: string;
  manufacturer: string;
  model: string;
}

export interface ImplantedDevice {
  id?: number;
  patientId?: number;
  deviceId: number;
  serial: string;
  status: string;
  implantedAt: string;
  explantedAt?: string | null;
  device: Device; // Nested device details
}

export interface ImplantedLead {
  id?: number;
  patientId?: number;
  leadId: number;
  serial: string;
  chamber: string;
  status: string;
  implantedAt: string;
  explantedAt?: string | null;
  lead: Lead; // Nested lead details
}

export interface Patient {
  id: number
  mrn: number
  fname: string
  lname: string
  dob: string
  phone: string
  email: string
  street: string
  city: string
  state: string
  country: string
  postal: string
  patientDoctors: PatientDoctor[]
  devices: ImplantedDevice[]
  leads: ImplantedLead[]
  medications: any[]
  reports: Report[]
  reportCount: number
  createdAt: string
  updatedAt: string
  tags: Tag[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PatientState {
  patients: Patient[]
  searchResults: Patient[]
  currentPatient: Patient | null
  pagination: PaginationInfo | null
  loading: boolean
  error: string | null
  
  // Actions
  fetchPatients: (page?: number, limit?: number, search?: string) => Promise<void>
  fetchPatient: (id: number) => Promise<void>
  createPatient: (data: Partial<Patient>) => Promise<Patient>
  updatePatient: (id: number, data: Partial<Patient>) => Promise<Patient>
  deletePatient: (id: number) => Promise<void>
  searchPatients: (query: string) => Promise<void>
  searchPatientsComplex: (params: Record<string, any>) => Promise<void>
  clearError: () => void
}

export const usePatientStore = create<PatientState>((set) => ({
  patients: [],
  searchResults: [],
  currentPatient: null,
  pagination: null,
  loading: false,
  error: null,

  fetchPatients: async () => {
    set({ loading: true, error: null })
    try {
      console.log('Fetching patients...')
      const response = await api.get('/patients/list')
      console.log('Patients response:', response.data)
      
      // Ensure we always set an array
      const patientsData = Array.isArray(response.data) ? response.data : []
      set({ patients: patientsData, loading: false })
    } catch (error: any) {
      console.error('Error fetching patients:', error)
      set({ 
        error: error.response?.data?.error || 'Failed to fetch patients', 
        loading: false,
        patients: [] // Ensure patients is still an array on error
      })
    }
  },

  fetchPatient: async (id: number) => {
    set({ loading: true, error: null })
    try {
      console.log(`Fetching patient ${id}...`)
      const response = await api.get(`/patients/${id}`)
      console.log('Patient response:', response.data)
      set({ currentPatient: response.data, loading: false })
    } catch (error: any) {
      console.error('Error fetching patient:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch patient', loading: false })
    }
  },

  createPatient: async (data: Partial<Patient>) => {
    set({ loading: true, error: null })
    try {
      console.log('Creating patient:', data)
      const response = await api.post('/patients', data)
      console.log('Create patient response:', response.data)
      
      const newPatient = response.data.patient || response.data
      set(state => ({ 
        patients: [newPatient, ...state.patients], 
        loading: false 
      }))
      return newPatient
    } catch (error: any) {
      console.error('Error creating patient:', error)
      set({ error: error.response?.data?.error || 'Failed to create patient', loading: false })
      throw error
    }
  },

  updatePatient: async (id: number, data: Partial<Patient>) => {
    set({ loading: true, error: null })
    try {
      console.log(`Updating patient ${id}:`, data)
      const response = await api.put(`/patients/${id}`, data)
      console.log('Update patient response:', response.data)
      
      const updatedPatient = response.data
      set(state => ({
        patients: state.patients.map(p => p.id === id ? updatedPatient : p),
        currentPatient: state.currentPatient?.id === id ? updatedPatient : state.currentPatient,
        loading: false
      }))
      return updatedPatient
    } catch (error: any) {
      console.error('Error updating patient:', error)
      set({ error: error.response?.data?.error || 'Failed to update patient', loading: false })
      throw error
    }
  },

  deletePatient: async (id: number) => {
    set({ loading: true, error: null })
    try {
      console.log(`Deleting patient ${id}...`)
      await api.delete(`/patients/${id}`)
      set(state => ({
        patients: state.patients.filter(p => p.id !== id),
        currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
        loading: false
      }))
    } catch (error: any) {
      console.error('Error deleting patient:', error)
      set({ error: error.response?.data?.error || 'Failed to delete patient', loading: false })
      throw error
    }
  },

  searchPatients: async (query: string) => {
    set({ loading: true, error: null })
    try {
      console.log(`Searching patients with query: ${query}`)
      const response = await api.get('/patients/search', { params: { search: query } })
      console.log('Search patients response:', response.data)
      
      // Ensure we always set an array
      const patientsData = Array.isArray(response.data) ? response.data : []
      set({ patients: patientsData, loading: false })
    } catch (error: any) {
      console.error('Error searching patients:', error)
      set({ 
        error: error.response?.data?.error || 'No patients found', 
        loading: false,
        patients: [] // Ensure patients is still an array on error
      })
    }
  },

  searchPatientsComplex: async (params: Record<string, any>) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/search/patients', { params })
      
      // 1. Defensively ensure searchResults is always an array
      const results = Array.isArray(response.data) ? response.data : []
      
      set({ searchResults: results, loading: false })

      // 2. Show a toast notification if no results are found
      if (results.length === 0) {
        toast.info("No patients found matching your criteria.")
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to perform complex search',
        loading: false,
        searchResults: [], // Ensure it's an empty array on error too
      })
      toast.error(error.response?.data?.error || 'An error occurred during the search.')
    }
  },
  clearError: () => set({ error: null })
}))