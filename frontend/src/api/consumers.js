import api from './axios'

export const getConsumers = (params) => api.get('/api/consumers/', { params })
export const getConsumer = (id) => api.get(`/api/consumers/${id}`)
export const createConsumer = (data) => api.post('/api/consumers/', data)
export const updateConsumer = (id, data) => api.put(`/api/consumers/${id}`, data)
export const deleteConsumer = (id) => api.delete(`/api/consumers/${id}`)
