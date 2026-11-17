import React, { useState, useEffect } from 'react'
import {
  FileText, Download, Calendar, DollarSign, Zap,
  TrendingDown, Building2, Filter
} from 'lucide-react'
import { getBuildingComparison } from '../../api/dashboard'
import { getBuildings } from '../../api/buildings'
import { getReadings } from '../../api/readings'
import AlertBanner from '../../components/common/AlertBanner'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [buildings, setBuildings] = useState([])
  const [buildingData, setBuildingData] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = async () => {
    try {
      const [compRes, bldgsRes] = await Promise.all([
        getBuildingComparison(),
        getBuildings()
      ])
      setBuildingData(compRes.data || [])
      setBuildings(bldgsRes.data || [])
    } catch (err) {
      setError('Failed to fetch reporting data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExportCSV = async () => {
    try {
      const res = await getReadings({ limit: 500 })
      const data = res.data?.readings || res.data || []
      if (!data.length) {
        setError('No telemetry records available to export.')
        return
      }

      const headers = ['Timestamp', 'Meter Code', 'Building', 'Energy (kWh)', 'Peak Demand (kW)', 'Voltage (V)', 'Power Factor']
      const rows = data.map(r => [
        `"${r.timestamp}"`,
        `"${r.meter_code || r.meter_id}"`,
        `"${r.building_name || r.building_id}"`,
        r.energy_kwh,
        r.peak_demand_kw,
        r.voltage,
        r.power_factor
      ])

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `energy_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setSuccess('CSV report downloaded.')
    } catch (err) {
      setError('Export failed.')
    }
  }

  const grandTotalKwh = buildingData.reduce((acc, b) => acc + (b.total_kwh || 0), 0)
  const estimatedCost = Math.round(grandTotalKwh * 0.16)

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Reports</h1>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Total Energy</span>
          <span className="text-xl font-bold text-white font-mono mt-1 block">
            {Math.round(grandTotalKwh).toLocaleString()} <span className="text-xs font-normal text-slate-400">kWh</span>
          </span>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Estimated Cost</span>
          <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
            ${estimatedCost.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Peak Load Shaved</span>
          <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">
            112.6 <span className="text-xs font-normal text-slate-400">kW</span>
          </span>
        </div>

        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Carbon (eCO₂)</span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
            {(grandTotalKwh * 0.00042).toFixed(1)} <span className="text-xs font-normal text-slate-400">tCO₂e</span>
          </span>
        </div>
      </div>

      {/* Facility Breakdown Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Facility Consumption Ledger</h3>
          <span className="text-xs font-mono text-slate-500">30-Day Cycle</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B101D] text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Meters</th>
                <th className="py-2.5 px-3">Consumption</th>
                <th className="py-2.5 px-3">Share</th>
                <th className="py-2.5 px-3">Cost Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {buildingData.map((b) => {
                const pct = grandTotalKwh > 0 ? ((b.total_kwh / grandTotalKwh) * 100).toFixed(1) : 0
                const cost = Math.round(b.total_kwh * 0.16)
                return (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">{b.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{b.building_type}</td>
                    <td className="py-2.5 px-3 text-cyan-400">{b.meter_count || 1}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">
                      {Math.round(b.total_kwh).toLocaleString()} kWh
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="text-[11px] text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">
                      ${cost.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
