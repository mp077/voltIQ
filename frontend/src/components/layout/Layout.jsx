import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/consumers': 'Consumers',
  '/buildings': 'Buildings',
  '/meters': 'Smart Meters',
  '/monitoring': 'Energy Monitoring',
  '/anomalies': 'Anomaly Detection',
  '/alerts': 'Alerts',
  '/maintenance': 'Maintenance',
  '/demand-response': 'Demand Response',
  '/analytics': 'Analytics & Forecasting',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'EnergyIQ'

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <TopNav pageTitle={pageTitle} sidebarCollapsed={sidebarCollapsed} />
        <main className="pt-16 min-h-screen">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
