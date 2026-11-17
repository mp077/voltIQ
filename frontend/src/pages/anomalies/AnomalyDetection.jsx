import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, Cpu, Play, CheckCircle2,
  Building2, Gauge, Clock, Filter
} from 'lucide-react'
import { getAnomalies, detectAnomalies, updateAnomalyStatus, getAnomalyStats } from '../../api/anomalies'
import { getBuildings } from '../../api/buildings'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import AlertBanner from '../../components/common/AlertBanner'

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState([])
  const [stats, setStats] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const loadData = async () => {
    try {
      const [anomRes, statsRes, bldgsRes] = await Promise.all([
        getAnomalies({
          building_id: selectedBuilding || undefined,
          status: selectedStatus || undefined
        }),
        getAnomalyStats(),
        getBuildings()
      ])
      setAnomalies(anomRes.data?.anomalies || anomRes.data || [])
      setStats(statsRes.data || null)
      setBuildings(bldgsRes.data || [])
    } catch (err) {
      setError('Failed to fetch anomaly records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedBuilding, selectedStatus])

  const handleRunDetection = async () => {
    setDetecting(true)
    setError('')
    try {
      const res = await detectAnomalies()
      setSuccess(`Inference complete: ${res.data?.anomalies_detected || 0} anomalies detected.`)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed.')
    } finally {
      setDetecting(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateAnomalyStatus(id, { status })
      setSuccess(`Updated anomaly status to ${status}.`)
      loadData()
    } catch (err) {
      setError('Failed to update status.')
    }
  }

  const columns = [
    {
      header: 'Time',
      accessor: 'detected_at',
      render: (val) => (
        <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {val}
        </span>
      )
    },
    {
      header: 'Meter',
      accessor: 'meter_code',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-amber-400">
          {val || '—'}
        </span>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => <span className="text-xs text-white font-mono">{val}</span>
    },
    {
      header: 'Score',
      accessor: 'anomaly_score',
      render: (val) => {
        const score = typeof val === 'number' ? val : -0.15
        const pct = Math.min(100, Math.max(10, Math.round((Math.abs(score)) * 200)))
        return (
          <div className="space-y-1 w-24">
            <div className="text-[11px] font-mono font-bold text-rose-400">
              {score.toFixed(3)}
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (val) => (
        <span className="text-xs text-slate-300 font-mono">
          {val || 'Surge deviation detected'}
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
        <div className="flex items-center gap-1.5">
          {row.status === 'open' && (
            <button
              onClick={() => handleStatusChange(id, 'acknowledged')}
              className="px-2.5 py-1 text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
            >
              Acknowledge
            </button>
          )}
          {row.status !== 'resolved' && (
            <button
              onClick={() => handleStatusChange(id, 'resolved')}
              className="px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
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
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Anomaly Detection</h1>
        </div>
        <button
          onClick={handleRunDetection}
          disabled={detecting}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <Cpu className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
          {detecting ? 'Running...' : 'Run Detection'}
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Total Incidents</span>
          <span className="text-xl font-bold text-white font-mono mt-1 block">
            {stats?.total_anomalies || anomalies.length}
          </span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Open Flags</span>
          <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">
            {stats?.open_anomalies || 0}
          </span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Resolved</span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
            {(stats?.total_anomalies || anomalies.length) - (stats?.open_anomalies || 0)}
          </span>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
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

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {anomalies.length} incidents
          </span>
        </div>

        <DataTable
          columns={columns}
          data={anomalies}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search incidents..."
        />
      </div>
    </div>
  )
}
