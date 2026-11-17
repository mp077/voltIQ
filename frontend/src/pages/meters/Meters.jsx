import React, { useState, useEffect } from 'react'
import { Plus, Gauge, Zap, RefreshCw, Trash2, Edit2, Play, Activity } from 'lucide-react'
import { getMeters, createMeter, updateMeter, deleteMeter, simulateMeterReading, getMeterReadings } from '../../api/meters'
import { getBuildings } from '../../api/buildings'
import { getConsumers } from '../../api/consumers'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import AlertBanner from '../../components/common/AlertBanner'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'

export default function Meters() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [meters, setMeters] = useState([])
  const [buildings, setBuildings] = useState([])
  const [consumers, setConsumers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [simulatingId, setSimulatingId] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [viewingMeter, setViewingMeter] = useState(null)
  const [readingsList, setReadingsList] = useState([])

  const [form, setForm] = useState({
    meter_code: '',
    building_id: '',
    consumer_id: '',
    meter_type: 'Three-Phase Smart',
    installation_date: new Date().toISOString().split('T')[0],
    status: 'active',
    tariff_category_id: 1
  })

  const loadData = async () => {
    try {
      const [mtrsRes, bldgsRes, consRes] = await Promise.all([
        getMeters(),
        getBuildings(),
        getConsumers()
      ])
      setMeters(mtrsRes.data || [])
      setBuildings(bldgsRes.data || [])
      setConsumers(consRes.data || [])
    } catch (err) {
      setError('Failed to fetch smart meter inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setForm({
      meter_code: `MTR-2024-${Math.floor(100 + Math.random() * 900)}`,
      building_id: buildings[0]?.id || '',
      consumer_id: consumers[0]?.id || '',
      meter_type: 'Three-Phase Smart',
      installation_date: new Date().toISOString().split('T')[0],
      status: 'active',
      tariff_category_id: 1
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setForm({
      meter_code: item.meter_code,
      building_id: item.building_id,
      consumer_id: item.consumer_id || '',
      meter_type: item.meter_type || 'Three-Phase Smart',
      installation_date: item.installation_date || '',
      status: item.status || 'active',
      tariff_category_id: item.tariff_category_id || 1
    })
    setIsModalOpen(true)
  }

  const handleSimulate = async (meter) => {
    setSimulatingId(meter.id)
    try {
      const res = await simulateMeterReading(meter.id)
      setSuccess(`Simulated reading recorded for ${meter.meter_code}: ${res.data?.reading?.energy_kwh || '28.4'} kWh`)
    } catch (err) {
      setError('Simulation failed.')
    } finally {
      setSimulatingId(null)
    }
  }

  const handleViewReadings = async (meter) => {
    setViewingMeter(meter)
    try {
      const res = await getMeterReadings(meter.id, { limit: 10 })
      setReadingsList(res.data || [])
    } catch (err) {
      setError('Failed to load telemetry readings.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingItem) {
        await updateMeter(editingItem.id, form)
        setSuccess('Smart meter updated.')
      } else {
        await createMeter(form)
        setSuccess('Smart meter deployed.')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed.')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMeter(deleteId)
      setSuccess('Meter decommissioned.')
      setDeleteId(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed.')
    }
  }

  const columns = [
    {
      header: 'Meter ID',
      accessor: 'meter_code',
      render: (val) => (
        <span className="font-mono font-semibold text-amber-400">{val}</span>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => (
        <span className="font-mono text-xs text-white">{val}</span>
      )
    },
    {
      header: 'Consumer',
      accessor: 'consumer_name',
      render: (val) => (
        <span className="text-xs text-slate-300 font-mono">{val || 'Unassigned'}</span>
      )
    },
    {
      header: 'Type',
      accessor: 'meter_type',
      render: (val) => (
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
          {val}
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
          <button
            onClick={() => handleSimulate(row)}
            disabled={simulatingId === id}
            className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
            title="Pulse Reading"
          >
            <Play className={`w-4 h-4 ${simulatingId === id ? 'animate-spin text-amber-500' : ''}`} />
          </button>
          <button
            onClick={() => handleViewReadings(row)}
            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            title="Telemetry"
          >
            <Activity className="w-4 h-4" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteId(id)}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Smart Meters</h1>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Meter
          </button>
        )}
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={meters}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search meters..."
        />
      </div>

      {/* Telemetry Modal */}
      <Modal
        isOpen={!!viewingMeter}
        onClose={() => setViewingMeter(null)}
        title={viewingMeter ? `${viewingMeter.meter_code} — Telemetry` : 'Readings'}
        size="lg"
      >
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B101D] text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Energy (kWh)</th>
                <th className="py-2.5 px-3">Peak (kW)</th>
                <th className="py-2.5 px-3">Voltage (V)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {readingsList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">No telemetry recorded yet.</td>
                </tr>
              ) : (
                readingsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">{r.timestamp}</td>
                    <td className="py-2 px-3 font-semibold text-amber-400">{r.energy_kwh}</td>
                    <td className="py-2 px-3 text-cyan-400">{r.peak_demand_kw}</td>
                    <td className="py-2 px-3 text-slate-400">{r.voltage || '230'} V</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Smart Meter' : 'Register Meter'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
            >
              {editingItem ? 'Save' : 'Deploy'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Meter Serial / Code</label>
            <input
              type="text"
              required
              value={form.meter_code}
              onChange={(e) => setForm({ ...form, meter_code: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Building</label>
              <select
                value={form.building_id}
                onChange={(e) => setForm({ ...form, building_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assigned Consumer</label>
              <select
                value={form.consumer_id}
                onChange={(e) => setForm({ ...form, consumer_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Unassigned</option>
                {consumers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Meter Type</label>
              <select
                value={form.meter_type}
                onChange={(e) => setForm({ ...form, meter_type: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Three-Phase Smart">Three-Phase Smart</option>
                <option value="Single-Phase Digital">Single-Phase Digital</option>
                <option value="CT-Connected Industrial">CT-Connected Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Decommission Meter"
        message="Are you sure you want to decommission this meter?"
      />
    </div>
  )
}
