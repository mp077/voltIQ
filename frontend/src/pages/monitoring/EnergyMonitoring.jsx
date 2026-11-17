import React, { useState, useEffect } from 'react'
import {
  Activity, Zap, Gauge, Filter, Clock, Play, RefreshCw, TrendingUp
} from 'lucide-react'
import { getReadings, simulateReadings, getReadingStats } from '../../api/readings'
import { getBuildings } from '../../api/buildings'
import { getMeters } from '../../api/meters'
import DataTable from '../../components/common/DataTable'
import AlertBanner from '../../components/common/AlertBanner'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function EnergyMonitoring() {
  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [meters, setMeters] = useState([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedMeter, setSelectedMeter] = useState('')
  const [limit, setLimit] = useState(50)

  const loadData = async () => {
    try {
      const [readingsRes, statsRes, bldgsRes, metersRes] = await Promise.all([
        getReadings({
          building_id: selectedBuilding || undefined,
          meter_id: selectedMeter || undefined,
          limit: limit
        }),
        getReadingStats({
          building_id: selectedBuilding || undefined,
          meter_id: selectedMeter || undefined
        }),
        getBuildings(),
        getMeters()
      ])
      setReadings(readingsRes.data?.readings || readingsRes.data || [])
      setStats(statsRes.data || null)
      setBuildings(bldgsRes.data || [])
      setMeters(metersRes.data || [])
    } catch (err) {
      setError('Failed to fetch energy monitoring telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedBuilding, selectedMeter, limit])

  const handleSimulateAll = async () => {
    setSimulating(true)
    setError('')
    try {
      const res = await simulateReadings()
      setSuccess(`Simulated cycle complete (${res.data?.count || 10} readings generated).`)
      loadData()
    } catch (err) {
      setError('Simulation failed.')
    } finally {
      setSimulating(false)
    }
  }

  const chartData = [...readings].reverse().slice(-30).map(r => ({
    time: r.timestamp?.split(' ')[1]?.substring(0, 5) || r.timestamp,
    energy_kwh: r.energy_kwh,
    peak_demand: r.peak_demand_kw,
    avg_comparison: stats?.avg_kwh || 35.0
  }))

  const columns = [
    {
      header: 'Time',
      accessor: 'timestamp',
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
      render: (val) => (
        <span className="text-xs text-slate-300 font-mono">{val || '—'}</span>
      )
    },
    {
      header: 'Energy (kWh)',
      accessor: 'energy_kwh',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-white">{val?.toFixed ? val.toFixed(2) : val}</span>
      )
    },
    {
      header: 'Peak (kW)',
      accessor: 'peak_demand_kw',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-cyan-400">{val?.toFixed ? val.toFixed(2) : val}</span>
      )
    },
    {
      header: 'Voltage (V)',
      accessor: 'voltage',
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">{val ? `${val} V` : '230 V'}</span>
      )
    },
    {
      header: 'Power Factor',
      accessor: 'power_factor',
      render: (val) => (
        <span className="font-mono text-xs text-emerald-400">{val ? val.toFixed(2) : '0.94'}</span>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Energy Monitoring</h1>
        </div>

        <button
          onClick={handleSimulateAll}
          disabled={simulating}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
          {simulating ? 'Generating...' : 'Simulate Pulse'}
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Total Consumption</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats?.total_energy_kwh ? Math.round(stats.total_energy_kwh).toLocaleString() : '—'} <span className="text-xs font-normal text-slate-400">kWh</span>
            </span>
          </div>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Average Interval</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">
              {stats?.avg_kwh ? stats.avg_kwh.toFixed(1) : '—'} <span className="text-xs font-normal text-slate-400">kWh</span>
            </span>
          </div>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Voltage Baseline</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats?.avg_voltage ? stats.avg_voltage.toFixed(1) : '230.4'} <span className="text-xs font-normal text-slate-400">V</span>
            </span>
          </div>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-mono uppercase block">Power Factor</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {stats?.avg_power_factor ? stats.avg_power_factor.toFixed(2) : '0.94'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Interval Load Profile</h3>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span> Energy (kWh)</span>
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded bg-cyan-400 inline-block"></span> Peak (kW)</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
              <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
              <Area type="monotone" dataKey="energy_kwh" stroke="#F59E0B" strokeWidth={2} fill="url(#streamGrad)" name="Energy (kWh)" />
              <Area type="monotone" dataKey="peak_demand" stroke="#06B6D4" strokeWidth={2} fill="none" name="Peak (kW)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Controls & Readings Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedBuilding}
              onChange={(e) => { setSelectedBuilding(e.target.value); setSelectedMeter(''); }}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedMeter}
              onChange={(e) => setSelectedMeter(e.target.value)}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Meters</option>
              {meters
                .filter(m => !selectedBuilding || m.building_id === Number(selectedBuilding))
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.meter_code}</option>
                ))}
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-[#0B101D] border border-slate-700/80 text-xs font-mono text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <DataTable
          columns={columns}
          data={readings}
          loading={loading}
          searchable={false}
        />
      </div>
    </div>
  )
}
