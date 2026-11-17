import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Sliders, KeyRound, User, Save
} from 'lucide-react'
import { getSettings, updateSettings } from '../../api/settings'
import { updateMe, changePassword } from '../../api/auth'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'

export default function Settings() {
  const { user, isAdmin, setUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [systemSettings, setSystemSettings] = useState({
    energy_warning_threshold_kwh: '150.0',
    energy_critical_threshold_kwh: '250.0',
    peak_demand_threshold_kw: '100.0',
    anomaly_contamination_rate: '0.05',
    currency_symbol: '$',
    notification_email_enabled: 'true',
    demand_response_auto_notify: 'true'
  })

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    contact: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })

  const loadData = async () => {
    try {
      const res = await getSettings()
      if (res.data?.settings) {
        setSystemSettings(prev => ({ ...prev, ...res.data.settings }))
      }
      if (user) {
        setProfileForm({
          full_name: user.full_name || '',
          email: user.email || '',
          contact: user.contact || ''
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setError('')
    setSavingSettings(true)
    try {
      await updateSettings(systemSettings)
      setSuccess('Settings updated.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSavingProfile(true)
    try {
      const res = await updateMe(profileForm)
      setUser(res.data)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      })
      setSuccess('Password updated.')
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Settings</h1>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Threshold Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">System Thresholds</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Energy Warning Threshold (kWh)
                </label>
                <input
                  type="number"
                  step="5"
                  value={systemSettings.energy_warning_threshold_kwh}
                  onChange={(e) => setSystemSettings({ ...systemSettings, energy_warning_threshold_kwh: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Energy Critical Threshold (kWh)
                </label>
                <input
                  type="number"
                  step="5"
                  value={systemSettings.energy_critical_threshold_kwh}
                  onChange={(e) => setSystemSettings({ ...systemSettings, energy_critical_threshold_kwh: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Peak Demand Ceiling (kW)
                </label>
                <input
                  type="number"
                  step="5"
                  value={systemSettings.peak_demand_threshold_kw}
                  onChange={(e) => setSystemSettings({ ...systemSettings, peak_demand_threshold_kw: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Anomaly Sensitivity (0.01 - 0.15)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.2"
                  value={systemSettings.anomaly_contamination_rate}
                  onChange={(e) => setSystemSettings({ ...systemSettings, anomaly_contamination_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <User className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">User Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contact</label>
              <input
                type="text"
                value={profileForm.contact}
                onChange={(e) => setProfileForm({ ...profileForm, contact: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
