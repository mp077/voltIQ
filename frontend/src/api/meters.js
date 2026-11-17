import api from './axios'

export const getMeters = (params) => api.get('/api/meters/', { params })
export const getMeter = (id) => api.get(`/api/meters/${id}`)
export const createMeter = (data) => api.post('/api/meters/', data)
export const updateMeter = (id, data) => api.put(`/api/meters/${id}`, data)
export const deleteMeter = (id) => api.delete(`/api/meters/${id}`)
export const simulateReading = (id) => api.post(`/api/meters/${id}/simulate-reading`)
export const simulateMeterReading = (id) => api.post(`/api/meters/${id}/simulate-reading`)
export const getMeterReadings = (id, params) => api.get(`/api/meters/${id}/readings`, { params })
