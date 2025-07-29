import { create } from 'zustand'
import api from '../utils/axios'

interface Device {
  id: number
  name: string
  manufacturer: string
  model: string
  type: string
  isMri: boolean
}

interface DeviceState {
  devices: Device[]
  currentDevice: Device | null
  loading: boolean
  error: string | null
  fetchDevices: () => Promise<void>
  fetchDevice: (id: number) => Promise<void>
  createDevice: (data: Omit<Device, 'id'>) => Promise<Device | undefined>
  updateDevice: (id: number, data: Partial<Device>) => Promise<Device | undefined>
  deleteDevice: (id: number) => Promise<void>
  searchDevices: (query: string) => Promise<void>
  clearError: () => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  currentDevice: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchDevices: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/devices/all')
      set({ devices: response.data, loading: false })
    } catch (error: any) {
      console.error('Error fetching devices:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch devices', loading: false, devices: [] })
    }
  },

  fetchDevice: async (id: number) => {
    set({ loading: true, error: null, currentDevice: null })
    try {
      const response = await api.get(`/devices/${id}`)

      if (!response.data) {
        throw new Error('Device not found')
      }

      set({ currentDevice: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch device', loading: false })
    }
  },

  createDevice: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/devices', data)
      const newDevice = response.data
      set(state => ({
        devices: [newDevice, ...state.devices],
        loading: false
      }))
      return newDevice
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create device', loading: false })
      throw error
    }
  },

  updateDevice: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put(`/devices/${id}`, data)
      const updatedDevice = response.data
      set(state => ({
        devices: state.devices.map(d => d.id === id ? updatedDevice : d),
        currentDevice: state.currentDevice?.id === id ? updatedDevice : state.currentDevice,
        loading: false
      }))
      return updatedDevice
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update device', loading: false })
      throw error
    }
  },

  deleteDevice: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/devices/${id}`)
      set(state => ({
        devices: state.devices.filter(d => d.id !== id),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete device', loading: false })
      throw error
    }
  },

  searchDevices: async (query) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/devices/search', { params: { search: query } })
      set({ devices: response.data, loading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'No devices found', loading: false, devices: [] })
    }
  },
}))