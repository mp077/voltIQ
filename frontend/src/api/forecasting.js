import api from './axios'

export const getForecastPrediction = (params) => api.get('/api/forecasting/predict', { params })
export const getForecasts = (params) => api.get('/api/forecasting/predict', { params })
export const trainForecastModel = (data) => api.post('/api/forecasting/train', data)
export const retrainModel = (data) => api.post('/api/forecasting/train', data)
export const getForecastAccuracy = (params) => api.get('/api/forecasting/accuracy', { params })
export const getForecastHistory = (params) => api.get('/api/forecasting/history', { params })
