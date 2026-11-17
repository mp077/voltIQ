import api from './axios'

export const getAnomalies = (params) => api.get('/api/anomalies/', { params })
export const getAnomaly = (id) => api.get(`/api/anomalies/${id}`)
export const detectAnomalies = (data) => api.post('/api/anomalies/detect', data)
export const runDetection = (data) => api.post('/api/anomalies/detect', data)
export const updateAnomalyStatus = (id, data) => api.put(`/api/anomalies/${id}/status`, data)
export const acknowledgeAnomaly = (id) => api.put(`/api/anomalies/${id}/status`, { status: 'acknowledged' })
export const resolveAnomaly = (id) => api.put(`/api/anomalies/${id}/status`, { status: 'resolved' })
export const getAnomalyStats = () => api.get('/api/anomalies/stats')
