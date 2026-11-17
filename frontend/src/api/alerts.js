import api from './axios'

export const getAlerts = (params) => api.get('/api/alerts/', { params })
export const getAlert = (id) => api.get(`/api/alerts/${id}`)
export const acknowledgeAlert = (id) => api.put(`/api/alerts/${id}/acknowledge`)
export const resolveAlert = (id) => api.put(`/api/alerts/${id}/resolve`)
export const createAlert = (data) => api.post('/api/alerts/', data)
export const getAlertStats = () => api.get('/api/alerts/stats')
