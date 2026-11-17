import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AlertBanner from '../../components/common/AlertBanner'

const DEMO_CREDENTIALS = [
  { role: 'Admin', username: 'admin', password: 'Admin@123' },
  { role: 'Facility Manager', username: 'fm1', password: 'FM1@pass' },
  { role: 'Consumer', username: 'consumer1', password: 'Consumer@123' },
  { role: 'Technician', username: 'tech1', password: 'Tech1@pass' },
]

const Login = () => {
  const navigate = useNavigate()
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) {
      setError('Enter username and password')
      return
    }
    const result = await login(form)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message)
    }
  }

  const fillDemo = (cred) => {
    setForm({ username: cred.username, password: cred.password })
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        {/* Logo + branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3 text-amber-400">
            <Zap className="w-6 h-6 fill-amber-400/20" />
          </div>
          <h1 className="text-2xl font-bold font-mono text-white tracking-wider">VOLTIQ GRID</h1>
        </div>

        {/* Login card */}
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <AlertBanner type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Password"
                  className="w-full px-3 py-2 pr-10 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2 font-mono">Quick Access</span>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => fillDemo(cred)}
                  className="text-left px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#0B101D] hover:border-amber-500/50 text-[11px] transition-all text-slate-300"
                >
                  <div className="font-semibold text-white">{cred.role}</div>
                  <div className="text-slate-500 text-[10px]">@{cred.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
