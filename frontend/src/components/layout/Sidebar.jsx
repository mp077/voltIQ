import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Gauge, Activity,
  AlertTriangle, Bell, Wrench, Zap, BarChart3, FileText,
  Settings, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'facility_manager', 'consumer', 'technician'] },
  { path: '/consumers', label: 'Consumers', icon: Users, roles: ['admin', 'facility_manager'] },
  { path: '/buildings', label: 'Buildings', icon: Building2, roles: ['admin', 'facility_manager'] },
  { path: '/meters', label: 'Smart Meters', icon: Gauge, roles: ['admin', 'facility_manager'] },
  { path: '/monitoring', label: 'Energy Monitoring', icon: Activity, roles: ['admin', 'facility_manager', 'consumer'] },
  { path: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle, roles: ['admin', 'facility_manager'] },
  { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'facility_manager', 'consumer'] },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'facility_manager', 'technician'] },
  { path: '/demand-response', label: 'Demand Response', icon: Zap, roles: ['admin', 'facility_manager', 'consumer'] },
  { path: '/analytics', label: 'Analytics & Forecast', icon: BarChart3, roles: ['admin', 'facility_manager'] },
  { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'facility_manager', 'consumer'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'facility_manager', 'consumer', 'technician'] },
]

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter(item =>
    !user || item.roles.includes(user.role)
  )

  return (
    <aside className={`fixed left-0 top-0 h-full bg-[#0D1322] border-r border-slate-800/80 text-slate-300 flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
              <Zap className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white">VOLT<span className="text-amber-400">IQ</span></span>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 font-semibold">GRID</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono -mt-0.5">Energy & Demand SCADA</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/30 text-amber-400 mx-auto">
            <Zap className="w-5 h-5" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${collapsed ? 'hidden' : ''}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-2 hover:bg-slate-800 text-slate-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/5'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-xs text-amber-400 flex-shrink-0">
                {user?.full_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-[10px] text-slate-400 capitalize font-mono truncate">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
