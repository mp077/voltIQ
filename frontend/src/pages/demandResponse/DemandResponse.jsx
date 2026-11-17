import React, { useState, useEffect } from 'react'
import {
  Zap, Plus, CheckCircle, Clock, AlertTriangle, Users,
  Building2, ArrowDownRight, Check, X
} from 'lucide-react'
import { getDemandRequests, createDemandRequest, acknowledgeDemandRequest, updateDemandRequest } from '../../api/demandResponse'
import { getBuildings } from '../../api/buildings'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import AlertBanner from '../../components/common/AlertBanner'
import { useAuth } from '../../contexts/AuthContext'

export default function DemandResponse() {
  const { user, isFacilityManager } = useAuth()
  const [requests, setRequests] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [ackModalReq, setAckModalReq] = useState(null)
  const [completeModalReq, setCompleteModalReq] = useState(null)

  const [form, setForm] = useState({
    building_id: '',
    target_load_reduction_kw: 30.0,
    duration_minutes: 60,
    instructions: 'Thermostat setpoint +1.5C, reduce peripheral lighting.'
  })

  const [ackForm, setAckForm] = useState({
    response: 'accepted',
    notes: 'Load reduction scheduled.'
  })

  const [completeForm, setCompleteForm] = useState({
    actual_load_reduction_kw: 28.5,
    actual_consumption_kwh: 145.0
  })

  const loadData = async () => {
    try {
      const [drRes, bldgsRes] = await Promise.all([
        getDemandRequests(),
        getBuildings()
      ])
      setRequests(drRes.data || [])
      setBuildings(bldgsRes.data || [])
    } catch (err) {
      setError('Failed to fetch demand response events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setForm({
      building_id: buildings[0]?.id || '',
      target_load_reduction_kw: 30.0,
      duration_minutes: 60,
      instructions: 'Thermostat setpoint +1.5C, reduce peripheral lighting.'
    })
    setIsCreateOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createDemandRequest(form)
      setSuccess('Demand Response event published.')
      setIsCreateOpen(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch DR request.')
    }
  }

  const handleAckSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await acknowledgeDemandRequest(ackModalReq.id, ackForm)
      setSuccess(`Response recorded: ${ackForm.response}.`)
      setAckModalReq(null)
      loadData()
    } catch (err) {
      setError('Failed to record response.')
    }
  }

  const handleCompleteSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await updateDemandRequest(completeModalReq.id, {
        status: 'completed',
        actual_load_reduction_kw: parseFloat(completeForm.actual_load_reduction_kw),
        actual_consumption_kwh: parseFloat(completeForm.actual_consumption_kwh)
      })
      setSuccess('Demand Response event completed.')
      setCompleteModalReq(null)
      loadData()
    } catch (err) {
      setError('Failed to finalize event.')
    }
  }

  const columns = [
    {
      header: 'Event Code',
      accessor: 'request_code',
      render: (val, row) => (
        <span className="font-mono font-semibold text-amber-400">{val || `DR-00${row.id}`}</span>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => <span className="font-mono text-white text-xs">{val}</span>
    },
    {
      header: 'Target Shave',
      accessor: 'target_load_reduction_kw',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-cyan-400">
          {val} kW
        </span>
      )
    },
    {
      header: 'Actual Shave',
      accessor: 'actual_load_reduction_kw',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-emerald-400">
          {val ? `${val} kW` : '—'}
        </span>
      )
    },
    {
      header: 'Duration',
      accessor: 'duration_minutes',
      render: (val) => <span className="font-mono text-xs text-slate-400">{val} mins</span>
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
          {row.status === 'pending' && (
            <button
              onClick={() => {
                setAckModalReq(row)
                setAckForm({ response: 'accepted', notes: 'Load reduction scheduled.' })
              }}
              className="px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
            >
              Respond
            </button>
          )}
          {row.status !== 'completed' && isFacilityManager && (
            <button
              onClick={() => {
                setCompleteModalReq(row)
                setCompleteForm({
                  actual_load_reduction_kw: row.target_load_reduction_kw * 0.95,
                  actual_consumption_kwh: 120
                })
              }}
              className="px-2 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
            >
              Finalize
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
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Demand Response</h1>
        </div>
        {isFacilityManager && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        )}
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Total Shaved</span>
          <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">112.6 kW</span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Acceptance Rate</span>
          <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">92.4%</span>
        </div>
        <div className="bg-[#101827] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-mono uppercase block">Active Events</span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
            {requests.filter(r => r.status !== 'completed').length}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search events..."
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Demand Response"
        footer={
          <>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
            >
              Dispatch
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Reduction (kW)</label>
              <input
                type="number"
                step="0.5"
                required
                value={form.target_load_reduction_kw}
                onChange={(e) => setForm({ ...form, target_load_reduction_kw: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Duration (minutes)</label>
              <input
                type="number"
                required
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Curtailment Instructions</label>
            <textarea
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Acknowledge Modal */}
      <Modal
        isOpen={!!ackModalReq}
        onClose={() => setAckModalReq(null)}
        title="Record Response"
        footer={
          <>
            <button
              onClick={() => setAckModalReq(null)}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAckSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
            >
              Submit Response
            </button>
          </>
        }
      >
        <form onSubmit={handleAckSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Response Action</label>
            <select
              value={ackForm.response}
              onChange={(e) => setAckForm({ ...ackForm, response: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="accepted">Accept Curtailment</option>
              <option value="rejected">Reject (Critical Load)</option>
              <option value="partial">Partial Curtailment</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes</label>
            <textarea
              rows={3}
              value={ackForm.notes}
              onChange={(e) => setAckForm({ ...ackForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal
        isOpen={!!completeModalReq}
        onClose={() => setCompleteModalReq(null)}
        title="Finalize Event"
        footer={
          <>
            <button
              onClick={() => setCompleteModalReq(null)}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteSubmit}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
            >
              Finalize
            </button>
          </>
        }
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Actual Load Shaved (kW)</label>
              <input
                type="number"
                step="0.1"
                required
                value={completeForm.actual_load_reduction_kw}
                onChange={(e) => setCompleteForm({ ...completeForm, actual_load_reduction_kw: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Final Consumption (kWh)</label>
              <input
                type="number"
                step="0.1"
                required
                value={completeForm.actual_consumption_kwh}
                onChange={(e) => setCompleteForm({ ...completeForm, actual_consumption_kwh: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
