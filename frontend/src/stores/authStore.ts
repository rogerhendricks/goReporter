import { create } from 'zustand'
// import axios from 'axios'
import api from '../utils/axios'
// import { API_BASE_URL } from '../lib/api'
interface User {
  ID: string
  email: string
  username: string
  role: 'admin' | 'doctor' | 'user'
}

interface AuthState {
  accessToken: string | null
  user: User | null
  // role: string | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isInitialized: boolean;
  // isAdmin: boolean
  // isDoctor: boolean
  // isUser: boolean
  hasAccess: (roles: string[]) => boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (userData: {
    email: string
    username: string
    password: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
  initializeAuth: () => void
  // hasAccess: (roles: string[]) => boolean
  get isAdmin(): boolean;
  get isDoctor(): boolean;
  get isUser(): boolean;
}



export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  // role: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isInitialized: false,

  hasAccess: (roles: string[]) => {
    const { user } = get()
    return user ? roles.includes(user.role) : false
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

  // get isDoctor() {
  //   return get().role === 'DOCTOR'
  // },

  // hasAccess: (roles: string[]) => {
  //   const { role } = get()
  //   return role ? roles.includes(role) : false
  // },

  login: async (username: string, password: string) => {
    try {
      set({ loading: true, error: null })
      
      
      const response = await api.post('/auth/login', {
        username,
        password
      }, { withCredentials: true })
      
      const { token, user } = response.data
      
      console.log('Login successful:', token, user)



      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      // localStorage.setItem('userRole', user.role)

      set({
        accessToken: token,
        user,
        // role: user.role,
        isAuthenticated: true 
      })

      return true
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Login failed', isAuthenticated: false  })
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

      const { token, user } = response.data

      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      // localStorage.setItem('userRole', user.role)

      set({
        accessToken: token,
        user,
        isAuthenticated: true
        // role: user.role
      })


      return true
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Registration failed', isAuthenticated: false })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true })
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      // localStorage.removeItem('userRole')
      set({
        accessToken: null,
        user: null,
        // role: null,
        isAuthenticated: false
      })
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token', {}, {
        withCredentials: true
      })

      const { accessToken, user } = response.data

      set({
        accessToken,
        user,
        // role: user.role
      })

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('userRole', user.role)

      return accessToken
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
      set({
        accessToken: null,
        user: null,
        // role: null,
        isAuthenticated: false
      })
      throw error
    }
  },

  initializeAuth: () => {
    if (get().isInitialized) return;

    // const token = localStorage.getItem('accessToken')
    // const userData = localStorage.getItem('user')

    try {
      const token = localStorage.getItem('accessToken')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        const user = JSON.parse(userData)
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      // If there's an error (e.g., bad JSON), clear the stored data
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      set({ isAuthenticated: false, user: null, accessToken: null })
    } finally {
      // This block will always run, ensuring the app proceeds
      set({ isInitialized: true })
    }
  }
  
}))