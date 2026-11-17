import React, { useState, useEffect } from 'react'
import {
  Zap, TrendingUp, Gauge, AlertTriangle, Wrench, Shield,
  RefreshCw, Layers, ChevronRight, Activity, Thermometer
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getKpis, getRecentAlerts, getEnergyChart, getBuildingComparison, getEnergyDistribution } from '../../api/dashboard'
import { getBuildings } from '../../api/buildings'
import KPICard from '../../components/common/KPICard'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AlertBanner from '../../components/common/AlertBanner'
import { Link } from 'react-router-dom'

const ENERGY_COLORS = ['#F59E0B', '#06B6D4', '#10B981', '#EC4899', '#8B5CF6']

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState(null)
  const [chartDays, setChartDays] = useState(7)
  const [chartData, setChartData] = useState([])
  const [buildingData, setBuildingData] = useState([])
  const [distributionData, setDistributionData] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [buildings, setBuildings] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState(1)
  const [selectedFloor, setSelectedFloor] = useState(7)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [kpiRes, chartRes, bldgCompRes, distRes, alertsRes, bldgsRes] = await Promise.all([
        getKpis(),
        getEnergyChart({ days: chartDays, building_id: selectedBuilding }),
        getBuildingComparison(),
        getEnergyDistribution(),
        getRecentAlerts(),
        getBuildings()
      ])
      setKpis(kpiRes.data)
      setChartData(chartRes.data || [])
      setBuildingData(bldgCompRes.data || [])
      setDistributionData(distRes.data || [])
      setRecentAlerts(alertsRes.data || [])
      setBuildings(bldgsRes.data || [])
      if (bldgsRes.data?.length > 0 && !selectedBuilding) {
        setSelectedBuilding(bldgsRes.data[0].id)
      }
    } catch (err) {
      console.error(err)
      setError('Telemetry stream error. Please verify backend.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [chartDays, selectedBuilding])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const floors = [
    { floor: 15, label: 'F15 Executive', status: 'critical', excess: '+12%', temp: '24.8°C', kwh: 48.2 },
    { floor: 14, label: 'F14 Conference', status: 'warning', excess: '+6%', temp: '23.4°C', kwh: 36.5 },
    { floor: 13, label: 'F13 IT Data Hub', status: 'normal', excess: '+1%', temp: '21.0°C', kwh: 28.0 },
    { floor: 12, label: 'F12 Operations', status: 'normal', excess: '-2%', temp: '22.1°C', kwh: 24.3 },
    { floor: 11, label: 'F11 Research', status: 'normal', excess: '0%', temp: '22.5°C', kwh: 26.8 },
    { floor: 10, label: 'F10 Engineering', status: 'normal', excess: '-1%', temp: '22.0°C', kwh: 25.1 },
    { floor: 9, label: 'F9 Marketing', status: 'normal', excess: '+2%', temp: '23.0°C', kwh: 29.4 },
    { floor: 8, label: 'F8 Finance', status: 'normal', excess: '+3%', temp: '22.8°C', kwh: 27.6 },
    { floor: 7, label: 'F7 Chiller Plant', status: 'critical', excess: '+18%', temp: '25.6°C', kwh: 64.2 },
    { floor: 6, label: 'F6 Support Hub', status: 'normal', excess: '-3%', temp: '22.0°C', kwh: 23.5 },
    { floor: 5, label: 'F5 Substation', status: 'warning', excess: '+8%', temp: '24.2°C', kwh: 42.1 },
    { floor: 4, label: 'F4 Cafeteria', status: 'warning', excess: '+5%', temp: '23.9°C', kwh: 38.0 },
    { floor: 3, label: 'F3 Facilities', status: 'normal', excess: '-4%', temp: '21.5°C', kwh: 19.8 },
    { floor: 2, label: 'F2 Reception', status: 'normal', excess: '-1%', temp: '22.2°C', kwh: 21.0 },
    { floor: 1, label: 'F1 Main Atrium', status: 'normal', excess: '-5%', temp: '21.8°C', kwh: 22.4 },
  ]

  const currentBuildingObj = buildings.find(b => b.id === Number(selectedBuilding)) || buildings[0]

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner text="Connecting to SCADA grid telemetry..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grid Status Ribbon */}
      <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white tracking-wider">GRID MONITORING</span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[11px] px-2 py-0.5 rounded-full font-mono border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {currentBuildingObj?.name || 'Alpha Tower'} • 230V Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#0B101D] px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-amber-400 font-semibold">50.0 Hz</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-semibold">PF 0.94</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KPICard
          title="Total Energy"
          value={kpis?.total_energy_kwh !== undefined ? Math.round(kpis.total_energy_kwh).toLocaleString() : '—'}
          unit="kWh"
          icon={Zap}
          color="amber"
          trend="+4.2%"
        />
        <KPICard
          title="Peak Demand"
          value={kpis?.peak_demand_kw !== undefined ? kpis.peak_demand_kw : '—'}
          unit="kW"
          icon={Activity}
          color="cyan"
          trend="-2.1%"
        />
        <KPICard
          title="Smart Meters"
          value={kpis ? `${kpis.active_meters} / ${kpis.total_meters}` : '—'}
          unit="online"
          icon={Gauge}
          color="green"
        />
        <KPICard
          title="Anomalies"
          value={kpis?.open_anomalies !== undefined ? kpis.open_anomalies : '—'}
          unit="active"
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Maintenance"
          value={kpis?.pending_maintenance !== undefined ? kpis.pending_maintenance : '—'}
          unit="pending"
          icon={Wrench}
          color="purple"
        />
        <KPICard
          title="Grid Uptime"
          value={kpis?.uptime_pct !== undefined ? `${kpis.uptime_pct}%` : '99.9%'}
          icon={Shield}
          color="green"
        />
      </div>

      {/* 3D Floor Stack & Building Energy Scan */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-800 gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Floor Load Scan</h2>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">Building:</span>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="bg-[#0B101D] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: 3D Building Floor Stack */}
          <div className="lg:col-span-5 bg-[#0A0E17] border border-slate-800/80 rounded-xl p-4 text-slate-200">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-amber-400 font-bold tracking-wide uppercase">
                {currentBuildingObj?.name || 'ALPHA TOWER'}
              </span>
              <span className="text-[10px] text-slate-400">Floors 1-15</span>
            </div>

            {/* Excess scale legend */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3 px-1 font-mono">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Warning</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Normal</div>
            </div>

            {/* Stacked floor plates */}
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {floors.map((fl) => {
                const isSelected = selectedFloor === fl.floor
                let plateStyle = 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                if (fl.status === 'critical') plateStyle = 'bg-gradient-to-r from-rose-950/80 to-amber-950/60 border-rose-500/60 text-white shadow-sm'
                else if (fl.status === 'warning') plateStyle = 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                if (isSelected) plateStyle += ' ring-1 ring-cyan-400'

                return (
                  <div
                    key={fl.floor}
                    onClick={() => setSelectedFloor(fl.floor)}
                    className={`cursor-pointer transition-all border rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs font-mono ${plateStyle}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[11px] text-amber-400">{`F${fl.floor < 10 ? '0' + fl.floor : fl.floor}`}</span>
                      <span className="text-[11px] truncate max-w-[170px]">{fl.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{fl.temp}</span>
                      <span className={`text-[11px] font-bold ${fl.status === 'critical' ? 'text-rose-400' : fl.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {fl.excess}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Selected: Floor {selectedFloor}</span>
              <span className="text-cyan-400 font-bold">Draw: ~{floors.find(f => f.floor === selectedFloor)?.kwh || 35} kWh</span>
            </div>
          </div>

          {/* Right: BECON Target & Daily Trend Widgets */}
          <div className="lg:col-span-7 space-y-4">
            {/* Status & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0A0E17] border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">Load Variance</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Efficient
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2 font-mono">
                  <span className="text-3xl font-black text-emerald-400">-9.6%</span>
                  <span className="text-xs text-slate-400">vs Previous Cycle</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Present: <strong className="text-white">1,420 kWh</strong></span>
                    <span>Prev: 1,570 kWh</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0E17] border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">Monthly Budget</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Cap 50 MWh
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2 font-mono">
                  <span className="text-3xl font-black text-amber-400">70%</span>
                  <span className="text-xs text-slate-400">Utilized</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Used: <strong className="text-white">35,000 kWh</strong></span>
                    <span>Remaining: 15,000 kWh</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Load Profile */}
            <div className="bg-[#0A0E17] border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">Daily Profile (24h)</span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span> Energy (kWh)</span>
                  <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded bg-cyan-400 inline-block"></span> Peak (kW)</span>
                </div>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(-24)}>
                    <defs>
                      <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="total_kwh" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#energyGrad)" name="Energy (kWh)" />
                    <Line type="monotone" dataKey="peak_demand" stroke="#06B6D4" strokeWidth={2} dot={false} name="Peak (kW)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sub-breakdown bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs font-mono">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>HVAC Chiller (45%)</span>
                  <span>Motors (25%)</span>
                  <span>Lighting (18%)</span>
                  <span>Plug Load (12%)</span>
                </div>
                <div className="w-full flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                  <div className="bg-amber-500 h-full" style={{ width: '45%' }}></div>
                  <div className="bg-cyan-500 h-full" style={{ width: '25%' }}></div>
                  <div className="bg-emerald-500 h-full" style={{ width: '18%' }}></div>
                  <div className="bg-violet-500 h-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid (2 Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Consumption Trend */}
        <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Consumption Trend</h3>
            <div className="flex items-center gap-1 bg-[#0A0E17] border border-slate-800 p-1 rounded-xl text-xs font-mono font-semibold">
              <button
                onClick={() => setChartDays(7)}
                className={`px-2.5 py-1 rounded-lg transition-all ${chartDays === 7 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                7d
              </button>
              <button
                onClick={() => setChartDays(14)}
                className={`px-2.5 py-1 rounded-lg transition-all ${chartDays === 14 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                14d
              </button>
              <button
                onClick={() => setChartDays(30)}
                className={`px-2.5 py-1 rounded-lg transition-all ${chartDays === 30 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                30d
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="total_kwh" stroke="#F59E0B" strokeWidth={2} fill="url(#amberGrad)" name="Total kWh" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Building Comparison */}
        <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Facility Comparison</h3>
            <Link to="/buildings" className="text-xs font-mono font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" stroke="#64748B" tick={{ fontSize: 10, fill: '#94A3B8' }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="total_kwh" fill="#06B6D4" radius={[0, 6, 6, 0]} name="kWh">
                  {buildingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[index % ENERGY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Demand Line Chart */}
        <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Peak Demand (kW)</h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Active Load
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="peak_demand" stroke="#06B6D4" strokeWidth={2} dot={{ r: 2 }} name="Peak (kW)" />
                <Line type="monotone" dataKey="avg_kwh" stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1.5} dot={false} name="Avg (kWh)" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Distribution */}
        <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Portfolio Share</h3>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              30-Day Sum
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="total_kwh"
                  nameKey="building"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ building, pct }) => `${building?.substring(0, 7)} (${pct}%)`}
                  labelLine={false}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[index % ENERGY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Active Alarms</h3>
          <Link to="/alerts" className="text-xs font-mono font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Open Alarm Center <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A0E17] text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Alarm Description</th>
                <th className="py-2.5 px-4">Zone</th>
                <th className="py-2.5 px-4">Event</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No active alarm flags.
                  </td>
                </tr>
              ) : (
                recentAlerts.slice(0, 5).map((al) => (
                  <tr key={al.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <StatusBadge status={al.severity} />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white">{al.title}</td>
                    <td className="py-2.5 px-4 text-slate-400">{al.building_name || 'System Wide'}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] text-amber-400">{al.alert_type?.replace('_', ' ')}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={al.status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{al.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
