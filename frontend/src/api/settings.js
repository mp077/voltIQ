import api from './axios'

export const getSettings = () => api.get('/api/settings/')
export const updateSettings = (data) => api.put('/api/settings/', data)
export const getSetting = (key) => api.get(`/api/settings/${key}`)
export const updateSetting = (key, value) => api.put(`/api/settings/${key}`, { value })
