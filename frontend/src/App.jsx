import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoadingSpinner from './components/common/LoadingSpinner'

// Pages
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Consumers from './pages/consumers/Consumers'
import Buildings from './pages/buildings/Buildings'
import Meters from './pages/meters/Meters'
import EnergyMonitoring from './pages/monitoring/EnergyMonitoring'
import AnomalyDetection from './pages/anomalies/AnomalyDetection'
import Alerts from './pages/alerts/Alerts'
import Maintenance from './pages/maintenance/Maintenance'
import DemandResponse from './pages/demandResponse/DemandResponse'
import Analytics from './pages/analytics/Analytics'
import Reports from './pages/reports/Reports'
import Settings from './pages/settings/Settings'

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, initializing, user } = useAuth()

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <LoadingSpinner text="Authenticating EnergyIQ session..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="consumers" element={<Consumers />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="meters" element={<Meters />} />
            <Route path="monitoring" element={<EnergyMonitoring />} />
            <Route path="anomalies" element={<AnomalyDetection />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="demand-response" element={<DemandResponse />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
