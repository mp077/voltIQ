import React, { useState } from 'react'
import { Bell, ChevronDown, LogOut, User, Settings, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../common/StatusBadge'

const TopNav = ({ pageTitle, sidebarCollapsed }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header
      className={`fixed top-0 right-0 z-30 bg-[#0D1322]/95 backdrop-blur border-b border-slate-800/80 shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-64'}`}
    >
      <div className="flex items-center justify-between px-6 h-16 text-slate-200">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-white tracking-wide uppercase">{pageTitle}</h1>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            50.02 Hz
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/alerts')}
            className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Active Alarms"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-slate-950 text-xs font-black shadow-sm">
                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{user?.full_name || user?.username}</p>
                <p className="text-[10px] text-amber-400 font-mono capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#131B2E] border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-800 text-slate-400">
                    <p className="font-semibold text-white">{user?.full_name || user?.username}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/settings') }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <Settings className="w-4 h-4 text-amber-400" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNav
