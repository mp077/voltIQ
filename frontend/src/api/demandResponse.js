import api from './axios'

export const getDemandRequests = (params) => api.get('/api/demand-response/', { params })
export const getDemandRequest = (id) => api.get(`/api/demand-response/${id}`)
export const createDemandRequest = (data) => api.post('/api/demand-response/', data)
export const updateDemandRequest = (id, data) => api.put(`/api/demand-response/${id}`, data)
export const acknowledgeDemandRequest = (id, data) => api.post(`/api/demand-response/${id}/acknowledge`, data)
export const completeDemandRequest = (id, data) => api.put(`/api/demand-response/${id}/complete`, data)
