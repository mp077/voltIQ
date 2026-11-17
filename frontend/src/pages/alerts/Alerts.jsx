import React, { useState, useEffect } from 'react'
import {
  Bell, AlertTriangle, CheckCircle, Clock, ShieldAlert,
  Building2, Gauge, Filter, Check, Eye
} from 'lucide-react'
import { getAlerts, acknowledgeAlert, resolveAlert, getAlertStats } from '../../api/alerts'
import { getBuildings } from '../../api/buildings'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import AlertBanner from '../../components/common/AlertBanner'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../contexts/AuthContext'

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [activeTab, setActiveTab] = useState('all')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [detailAlert, setDetailAlert] = useState(null)

  const loadData = async () => {
    try {
      const [alertsRes, statsRes, bldgsRes] = await Promise.all([
        getAlerts({
          status: activeTab !== 'all' ? activeTab : undefined,
          severity: selectedSeverity || undefined,
          building_id: selectedBuilding || undefined
        }),
        getAlertStats(),
        getBuildings()
      ])
      setAlerts(alertsRes.data || [])
      setStats(statsRes.data || null)
      setBuildings(bldgsRes.data || [])
    } catch (err) {
      setError('Failed to fetch system alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab, selectedSeverity, selectedBuilding])

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id)
      setSuccess('Alert acknowledged.')
      loadData()
    } catch (err) {
      setError('Failed to acknowledge alert.')
    }
  }

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id)
      setSuccess('Alert resolved.')
      loadData()
    } catch (err) {
      setError('Failed to resolve alert.')
    }
  }

  const calculateLatency = (createdAt, ackAt) => {
    if (!ackAt || !createdAt) return 'Pending'
    const diffMs = new Date(ackAt) - new Date(createdAt)
    const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)))
    if (diffMins < 60) return `${diffMins}m`
    return `${(diffMins / 60).toFixed(1)}h`
  }

  const columns = [
    {
      header: 'Severity',
      accessor: 'severity',
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Alert',
      accessor: 'title',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-white font-mono text-xs">{val}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{row.description}</div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'alert_type',
      render: (val) => (
        <span className="font-mono text-xs uppercase text-amber-400">
          {val?.replace('_', ' ')}
        </span>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => <span className="text-xs font-mono text-slate-300">{val || 'System Wide'}</span>
    },
    {
      header: 'Latency',
      accessor: 'created_at',
      render: (val, row) => (
        <span className="text-xs font-mono text-slate-400">
          {calculateLatency(val, row.acknowledged_at)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-1.5 font-mono">
          <button
            onClick={() => setDetailAlert(row)}
            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            title="Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'open' && (
            <button
              onClick={() => handleAcknowledge(id)}
              className="px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
            >
              Ack
            </button>
          )}
          {row.status !== 'resolved' && (
            <button
              onClick={() => handleResolve(id)}
              className="px-2 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Alerts</h1>
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Total</span>
          <span className="text-xl font-bold text-white font-mono mt-1 block">{stats?.total || alerts.length}</span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-rose-400 font-mono uppercase block">Critical</span>
          <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">{stats?.critical || 0}</span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-amber-400 font-mono uppercase block">Open</span>
          <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">{stats?.open || 0}</span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-emerald-400 font-mono uppercase block">Avg Latency</span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">18.4m</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        {/* Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-1 bg-[#0A0E17] p-1 rounded-xl text-xs font-mono">
            {['all', 'open', 'acknowledged', 'resolved'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={alerts}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search alerts..."
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailAlert}
        onClose={() => setDetailAlert(null)}
        title="Alert Details"
      >
        {detailAlert && (
          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-[11px] text-slate-400 uppercase block mb-1">Title</span>
              <p className="text-white font-semibold text-sm">{detailAlert.title}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase block mb-1">Description</span>
              <p className="text-slate-300 bg-[#0B101D] p-3 rounded-xl border border-slate-800">{detailAlert.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 uppercase block mb-1">Severity</span>
                <StatusBadge status={detailAlert.severity} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase block mb-1">Status</span>
                <StatusBadge status={detailAlert.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 uppercase block mb-1">Created</span>
                <span className="text-slate-300">{detailAlert.created_at}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase block mb-1">Acknowledged</span>
                <span className="text-slate-300">{detailAlert.acknowledged_at || 'Pending'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
