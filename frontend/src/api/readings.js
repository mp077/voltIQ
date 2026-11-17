import api from './axios'

export const getReadings = (params) => api.get('/api/readings/', { params })
export const getReading = (id) => api.get(`/api/readings/${id}`)
export const getLatestReadings = () => api.get('/api/readings/latest')
export const simulateReadings = (data) => api.post('/api/readings/simulate', data)
export const simulateReading = (data) => api.post('/api/readings/simulate', data)
export const getReadingStats = (params) => api.get('/api/readings/stats', { params })
export const addReading = (data) => api.post('/api/readings/', data)
export const getReadingsByMeter = (meterId, params) => api.get('/api/readings/', { params: { meter_id: meterId, ...params } })
export const getReadingsByBuilding = (buildingId, params) => api.get('/api/readings/', { params: { building_id: buildingId, ...params } })
