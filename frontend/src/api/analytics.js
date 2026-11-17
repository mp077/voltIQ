import api from './axios'

export const getConsumptionAnalytics = (params) => api.get('/api/analytics/consumption', { params })
export const getBuildingComparisonAnalytics = (params) => api.get('/api/analytics/buildings-comparison', { params })
export const getBuildingComparison = (params) => api.get('/api/analytics/buildings-comparison', { params })
export const getPeakDemandAnalytics = (params) => api.get('/api/analytics/peak-demand', { params })
export const getAnomalyFrequency = (params) => api.get('/api/analytics/anomaly-frequency', { params })
export const getAnomalyAnalytics = (params) => api.get('/api/analytics/anomaly-frequency', { params })
export const getLoadReduction = (params) => api.get('/api/analytics/load-reduction', { params })
export const getPerformanceMetrics = (params) => api.get('/api/analytics/performance-metrics', { params })
export const getTariffAnalysis = (params) => api.get('/api/analytics/tariff-analysis', { params })
