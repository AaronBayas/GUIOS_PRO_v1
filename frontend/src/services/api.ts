import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor: handle session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.error || 'Tu sesión ha expirado'
      if (window.location.pathname !== '/login') {
        window.location.href = `/login?expired=1&msg=${encodeURIComponent(message)}`
      }
    }
    return Promise.reject(error)
  }
)

export default api
