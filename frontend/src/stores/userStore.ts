import { create } from 'zustand'
import api from '@/utils/axios'
import { toast } from 'sonner'

export interface User {
  ID?: string
  username: string
  fullName: string
  email: string
  role: 'admin' | 'doctor' | 'user' | 'viewer' | 'staff_doctor'
  password?: string
  createdAt: string
  updatedAt: string
  isTemporary: boolean
  expiresAt: string | null
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

const normalizeUserPayload = (user: User): User => ({
  ...user,
  password: '',
  isTemporary: Boolean(user.isTemporary),
  expiresAt: user.expiresAt || null,
})

const serializeUserData = (userData: Partial<User>) => ({
  ...userData,
  expiresAt: userData.expiresAt ? new Date(userData.expiresAt).toISOString() : null,
})

export const useUserStore = create<UserState>((set) => ({

  users: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchUsers: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get<User[]>('/users')
      const users = response.data.map(normalizeUserPayload)
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
      const response = await api.post<User>('/users', serializeUserData(userData))
      const newUser = normalizeUserPayload(response.data)
      set((state) => ({
        users: [...state.users, newUser],
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
      const response = await api.put<User>(`/users/${userId}`, serializeUserData(userData))
      const updatedUser = normalizeUserPayload(response.data)
      set((state) => ({
        users: state.users.map((user) =>
          user.ID === userId ? updatedUser : user
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
        users: state.users.filter((user) => user.ID !== userId),
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