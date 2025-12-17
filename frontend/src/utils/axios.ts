import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { API_BASE_URL } from '../lib/api'

const api = axios.create({
  // baseURL: '/api/',
  baseURL: API_BASE_URL,
  withCredentials: true
})

// Store CSRF token
let csrfToken: string | null = null

// Store refresh promise to prevent concurrent refresh attempts
let refreshPromise: Promise<void> | null = null

// Function to get CSRF token
export const fetchCSRFToken = async () => {
  try {
    const response = await api.get('/csrf-token')
    csrfToken = response.data.csrfToken
    return csrfToken
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    return null
  }
}

// api.interceptors.request.use((config) => {
//   const { accessToken, isAuthenticated } = useAuthStore.getState()
//   if (isAuthenticated && accessToken) {
//     config.headers.Authorization = `Bearer ${accessToken}`
//   }
//   return config
// })

// Request interceptor to add CSRF token
api.interceptors.request.use(async (config) => {
  // Add CSRF token for state-changing requests
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    if (!csrfToken) {
      await fetchCSRFToken()
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const { isAuthenticated } = useAuthStore.getState()
    
    // Handle CSRF token expiration
    if (error.response?.status === 403 && 
        error.response?.data?.error?.includes('CSRF') &&
        !originalRequest._retry) {
      originalRequest._retry = true
      await fetchCSRFToken()
      if (csrfToken) {
        originalRequest.headers['X-CSRF-Token'] = csrfToken
      }
      return api(originalRequest)
    }

    // If we get a 401 and haven't tried to refresh yet
    if (error.response?.status === 401 && 
        !originalRequest._retry &&
        isAuthenticated &&
        !originalRequest.url?.includes('/auth/refresh-token') &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/me') &&
        !originalRequest.url?.includes('/auth/logout')) {
      
      originalRequest._retry = true
      
      try {
        // Use existing refresh promise or create a new one
        if (!refreshPromise) {
          refreshPromise = useAuthStore.getState().refreshToken()
            .finally(() => {
              refreshPromise = null
            })
        }
        
        // Wait for the refresh to complete
        await refreshPromise
        
        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        refreshPromise = null
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
 