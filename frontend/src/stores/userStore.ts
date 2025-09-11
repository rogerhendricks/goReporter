import { create } from 'zustand'
import api from '@/utils/axios'
import { toast } from 'sonner'

export interface User {
  ID: string
  username: string
  email: string
  role: 'admin' | 'doctor' | 'user'
  password?: string
  createdAt: string
  updatedAt: string
}

interface UserState {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  createUser: (userData: Partial<User>) => Promise<User | null>
  updateUser: (userId: string, userData: Partial<User>) => Promise<User | null>
  deleteUser: (userId: string) => Promise<boolean>
  clearError: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchUsers: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get<User[]>('/users')
      const users = response.data.map(u => ({ ...u, password: '' }))
      set({ users, loading: false })
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch users'
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
    }
  },

  createUser: async (userData) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post<User>('/users', userData)
      const newUser = response.data
      set((state) => ({
        users: [...state.users, { ...newUser, password: '' }],
        loading: false,
      }))
      toast.success(`User "${newUser.username}" created successfully.`)
      return newUser
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create user'
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      return null
    }
  },

  updateUser: async (userId, userData) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put<User>(`/users/${userId}`, userData)
      const updatedUser = response.data
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? { ...updatedUser, password: '' } : user
        ),
        loading: false,
      }))
      toast.success(`User "${updatedUser.username}" updated successfully.`)
      return updatedUser
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update user'
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      return null
    }
  },

  deleteUser: async (userId) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/users/${userId}`)
      set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
        loading: false,
      }))
      toast.success('User deleted successfully.')
      return true
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user'
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      return false
    }
  },
}))