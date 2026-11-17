import api from './axios'

export const getBuildings = (params) => api.get('/api/buildings/', { params })
export const getBuilding = (id) => api.get(`/api/buildings/${id}`)
export const createBuilding = (data) => api.post('/api/buildings/', data)
export const updateBuilding = (id, data) => api.put(`/api/buildings/${id}`, data)
export const deleteBuilding = (id) => api.delete(`/api/buildings/${id}`)
export const getBuildingConsumption = (id, params) => api.get(`/api/buildings/${id}/consumption`, { params })
