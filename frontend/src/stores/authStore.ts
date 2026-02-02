// frontend/src/stores/authStore.ts
import { create } from 'zustand'
import api from '../utils/axios'

interface User {
  ID: number
  email: string
  username: string
  role: 'admin' | 'doctor' | 'user' | 'viewer'
  fullName?: string
  themePreference?: string
  CreatedAt?: string
  UpdatedAt?: string
  DeletedAt?: string | null
  isTemporary?: boolean
  expiresAt?: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  hasAccess: (roles: string[]) => boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (userData: {
    email: string
    username: string
    password: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  initializeAuth: () => Promise<void>
  updateTheme: (theme: string) => Promise<void>
  get isAdmin(): boolean
  get isDoctor(): boolean
  get isUser(): boolean
  get isViewer(): boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isInitialized: false,

  hasAccess: (roles: string[]) => {
    const { user } = get()
    if (!user || roles.length === 0) return false

    if (roles.includes(user.role)) return true

    if (roles.includes('user')) {
      if (user.role === 'viewer') {
        const restricted = ['admin', 'doctor']
        return !restricted.some((r) => roles.includes(r))
      }
    }

    return false
  },

  get isAdmin() {
    const role = get().user?.role
    return role?.toLowerCase() === 'admin'
  },

  get isDoctor() {
    const role = get().user?.role
    return role?.toLowerCase() === 'doctor'
  },
  
  get isUser() {
    const role = get().user?.role
    return role?.toLowerCase() === 'user'
  },

  get isViewer() {
    const role = get().user?.role
    return role?.toLowerCase() === 'viewer'
  },

  login: async (username: string, password: string) => {
    try {
      set({ loading: true, error: null })
      
      const response = await api.post('/auth/login', {
        username,
        password
      }, { withCredentials: true })
      
      const { user } = response.data
      
      console.log('Login successful:', user)
      console.log('User theme preference from login:', user?.themePreference)

      set({
        user,
        isAuthenticated: true 
      })

      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Login failed', 
        isAuthenticated: false,
        user: null
      })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  register: async (userData) => {
    try {
      set({ loading: true, error: null })

      const response = await api.post('/auth/register', userData, {
        withCredentials: true
      })

      const { user } = response.data

      set({
        user,
        isAuthenticated: true
      })

      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Registration failed', 
        isAuthenticated: false,
        user: null
      })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({
        user: null,
        isAuthenticated: false
      })
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token', {}, {
        withCredentials: true
      })

      const { user } = response.data

      set({
        user,
        isAuthenticated: true
      })
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false
      })
      throw error
    }
  },

  initializeAuth: async () => {
  if (get().isInitialized) return

  try {
    set({ loading: true })
    
    // Try to get current user with existing cookie
    const response = await api.get('/auth/me', { 
      withCredentials: true 
    })
    
    const user = response.data
    
    console.log('Auth initialized, user data:', user)
    console.log('User theme preference from /me:', user?.themePreference)

    set({
      user,
      isAuthenticated: true,
    })
  } catch (error) {
    // If /me fails, just mark as not authenticated
    // Don't try to refresh - let the user login manually
    set({ 
      isAuthenticated: false, 
      user: null 
    })
  } finally {
    set({ 
      isInitialized: true,
      loading: false 
    })
  }
},

  updateTheme: async (theme: string) => {
    try {
      console.log('updateTheme called with:', theme)
      const response = await api.put('/users/theme', { theme }, { withCredentials: true })
      console.log('updateTheme response:', response.data)
      
      // Update user state with new theme preference
      const { user } = get()
      if (user) {
        const updatedUser = {
          ...user,
          themePreference: theme
        }
        console.log('Updating user state with theme:', updatedUser)
        set({ user: updatedUser })
      }
    } catch (error: any) {
      console.error('Failed to update theme preference:', error)
      console.error('Error response:', error.response?.data)
      throw error
    }
  }
  // initializeAuth: async () => {
  //   if (get().isInitialized) return

  //   try {
  //     set({ loading: true })
      
  //     // Try to get current user with existing cookie
  //     const response = await api.get('/auth/me', { 
  //       withCredentials: true 
  //     })
      
  //     const user = response.data

  //     set({
  //       user,
  //       isAuthenticated: true,
  //     })
  //   } catch (error) {
  //     // If /me fails, try to refresh the token
  //     try {
  //       await get().refreshToken()
  //     } catch (refreshError) {
  //       // Both attempts failed, user is not authenticated
  //       set({ 
  //         isAuthenticated: false, 
  //         user: null 
  //       })
  //     }
  //   } finally {
  //     set({ 
  //       isInitialized: true,
  //       loading: false 
  //     })
  //   }
  // }
}))