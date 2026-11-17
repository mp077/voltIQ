import api from './axios'

export const getMaintenanceTasks = (params) => api.get('/api/maintenance/', { params })
export const getMyTasks = (params) => api.get('/api/maintenance/my-tasks', { params })
export const getMaintenanceTask = (id) => api.get(`/api/maintenance/${id}`)
export const createMaintenanceTask = (data) => api.post('/api/maintenance/', data)
export const updateMaintenanceTask = (id, data) => api.put(`/api/maintenance/${id}`, data)
export const deleteMaintenanceTask = (id) => api.delete(`/api/maintenance/${id}`)
export const updateTaskStatus = (id, status, notes) => api.put(`/api/maintenance/${id}`, { status, notes })
