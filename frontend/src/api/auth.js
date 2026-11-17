import api from './axios'

export const login = (credentials) => api.post('/api/auth/login', credentials)
export const logout = () => api.post('/api/auth/logout')
export const getMe = () => api.get('/api/auth/me')
export const updateMe = (data) => api.put('/api/auth/me', data)
export const changePassword = (data) => api.post('/api/auth/change-password', data)
