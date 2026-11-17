import axios from 'axios'

export const getBaseURL = () => {
  let url = (localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || '').trim()
  
  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    
    // Render's internal 'property: host' returns service name without domain (e.g. 'voltiq-backend-beje')
    // Browser needs public internet domain: 'voltiq-backend-beje.onrender.com'
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
        url = `https://${parsed.hostname}.onrender.com`
      }
    } catch (e) {
      if (!url.includes('.') && !url.includes('localhost')) {
        url = `${url}.onrender.com`
      }
    }
    return url.replace(/\/+$/, '')
  }

  // Localhost fallback
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000'
    }
  }
  return ''
}

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: set dynamic baseURL and attach JWT
api.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseURL()
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
