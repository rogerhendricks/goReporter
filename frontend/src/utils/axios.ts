import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { API_BASE_URL } from '../lib/api'

const api = axios.create({
  // baseURL: '/api/',
  baseURL: API_BASE_URL,
  withCredentials: true
})

api.interceptors.request.use((config) => {
  const { accessToken, isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { refreshToken, logout, isAuthenticated } = useAuthStore.getState()
    
    if (error.response?.status === 401 && 
      !error.config._retry &&
      isAuthenticated &&
    !error.config.url?.includes('/logout')) {
      error.config._retry = true
      try {
        await refreshToken()
        return api(error.config)
      } catch (refreshError) {
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
 