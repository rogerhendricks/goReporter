import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { API_BASE_URL } from '../lib/api'

const api = axios.create({
  // baseURL: '/api/',
  baseURL: API_BASE_URL,
  withCredentials: true
})

// api.interceptors.request.use((config) => {
//   const { accessToken, isAuthenticated } = useAuthStore.getState()
//   if (isAuthenticated && accessToken) {
//     config.headers.Authorization = `Bearer ${accessToken}`
//   }
//   return config
// })

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const { isAuthenticated } = useAuthStore.getState()
    
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
        // Try to refresh the token
        await useAuthStore.getState().refreshToken()
        
        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
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
 