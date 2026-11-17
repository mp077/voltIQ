import api from './axios'

export const getKpis = () => api.get('/api/dashboard/kpis')
export const getDashboardStats = () => api.get('/api/dashboard/kpis')
export const getRecentAlerts = (params) => api.get('/api/dashboard/recent-alerts', { params })
export const getEnergyChart = (params) => api.get('/api/dashboard/energy-chart', { params })
export const getConsumptionTrend = (params) => api.get('/api/dashboard/energy-chart', { params })
export const getBuildingComparison = (params) => api.get('/api/dashboard/building-comparison', { params })
export const getBuildingConsumption = (params) => api.get('/api/dashboard/building-comparison', { params })
export const getPeakDemandTrend = (params) => api.get('/api/dashboard/energy-chart', { params })
export const getEnergyDistribution = (params) => api.get('/api/dashboard/energy-distribution', { params })
