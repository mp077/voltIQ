import React, { useState, useEffect } from 'react'
import { Plus, Building2, MapPin, Gauge, UserCheck, Trash2, Edit2, BarChart2 } from 'lucide-react'
import { getBuildings, createBuilding, updateBuilding, deleteBuilding, getBuildingConsumption } from '../../api/buildings'
import { getUsers } from '../../api/users'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import AlertBanner from '../../components/common/AlertBanner'
import { useAuth } from '../../contexts/AuthContext'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function Buildings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [buildings, setBuildings] = useState([])
  const [facilityManagers, setFacilityManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [statsBuilding, setStatsBuilding] = useState(null)
  const [buildingStats, setBuildingStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    location: '',
    building_type: 'Office',
    floor_count: 10,
    total_area: 25000,
    facility_manager_id: ''
  })

  const loadData = async () => {
    try {
      const [bldgsRes, usersRes] = await Promise.all([
        getBuildings(),
        getUsers({ role: 'facility_manager' })
      ])
      setBuildings(bldgsRes.data || [])
      setFacilityManagers(usersRes.data || [])
    } catch (err) {
      setError('Failed to fetch buildings.')
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
      name: '',
      location: '',
      building_type: 'Office',
      floor_count: 10,
      total_area: 25000,
      facility_manager_id: facilityManagers[0]?.id || ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      location: item.location || '',
      building_type: item.building_type || 'Office',
      floor_count: item.floor_count || 1,
      total_area: item.total_area || 1000,
      facility_manager_id: item.facility_manager_id || ''
    })
    setIsModalOpen(true)
  }

  const handleOpenStats = async (bldg) => {
    setStatsBuilding(bldg)
    setStatsLoading(true)
    try {
      const res = await getBuildingConsumption(bldg.id)
      setBuildingStats(res.data)
    } catch (err) {
      setError('Failed to load consumption statistics.')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingItem) {
        await updateBuilding(editingItem.id, form)
        setSuccess('Building updated.')
      } else {
        await createBuilding(form)
        setSuccess('Building registered.')
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
      await deleteBuilding(deleteId)
      setSuccess('Building deleted.')
      setDeleteId(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed.')
    }
  }

  const columns = [
    {
      header: 'Code',
      accessor: 'building_code',
      render: (val, row) => (
        <span className="font-mono font-semibold text-amber-400">{val || `BLD-00${row.id}`}</span>
      )
    },
    {
      header: 'Building Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-white">{val}</div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-500" />
            {row.location}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'building_type',
      render: (val) => (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-cyan-300 border border-slate-700">
          {val}
        </span>
      )
    },
    {
      header: 'Floors / Area',
      accessor: 'floor_count',
      render: (val, row) => (
        <div className="text-xs text-slate-300 space-y-0.5 font-mono">
          <div>{val} Floors</div>
          <div className="text-slate-500 text-[11px]">{row.total_area?.toLocaleString()} sq.ft</div>
        </div>
      )
    },
    {
      header: 'Meters',
      accessor: 'meter_count',
      render: (val) => (
        <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Gauge className="w-3.5 h-3.5" />
          {val || 0} Online
        </span>
      )
    },
    {
      header: 'Facility Manager',
      accessor: 'facility_manager_name',
      render: (val) => (
        <div className="text-xs font-mono flex items-center gap-1.5 text-slate-300">
          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
          {val || 'Unassigned'}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenStats(row)}
            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            title="Stats"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
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
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Buildings</h1>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Building
          </button>
        )}
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={buildings}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search buildings..."
        />
      </div>

      {/* Stats Modal */}
      <Modal
        isOpen={!!statsBuilding}
        onClose={() => setStatsBuilding(null)}
        title={statsBuilding ? `${statsBuilding.name} — Consumption` : 'Building Telemetry'}
        size="lg"
      >
        {statsLoading ? (
          <div className="py-8 text-center text-xs font-mono text-slate-400">Loading data...</div>
        ) : buildingStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0B101D] border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total (30d)</div>
                <div className="text-lg font-mono font-bold text-amber-400 mt-1">
                  {Math.round(buildingStats.total_kwh || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">kWh</span>
                </div>
              </div>
              <div className="bg-[#0B101D] border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Peak Demand</div>
                <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
                  {buildingStats.peak_demand_kw || '—'} <span className="text-xs font-normal text-slate-400">kW</span>
                </div>
              </div>
              <div className="bg-[#0B101D] border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Meters</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {buildingStats.meters_count || statsBuilding?.meter_count || 0}
                </div>
              </div>
            </div>

            <div className="bg-[#0B101D] border border-slate-800 p-4 rounded-xl">
              <div className="text-xs font-mono text-slate-400 uppercase mb-3">Daily Consumption (kWh)</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buildingStats.daily_breakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B101D', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} />
                    <Bar dataKey="total_kwh" fill="#F59E0B" radius={[4, 4, 0, 0]} name="kWh" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Building' : 'Add Building'}
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
              {editingItem ? 'Save' : 'Register'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Building Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Building name"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Location</label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Address / Sector"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Type</label>
              <select
                value={form.building_type}
                onChange={(e) => setForm({ ...form, building_type: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Commercial">Commercial</option>
                <option value="Residential">Residential</option>
                <option value="Industrial">Industrial</option>
                <option value="Office">Office</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Floors</label>
              <input
                type="number"
                min="1"
                value={form.floor_count}
                onChange={(e) => setForm({ ...form, floor_count: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Area (sq.ft)</label>
              <input
                type="number"
                min="100"
                value={form.total_area}
                onChange={(e) => setForm({ ...form, total_area: parseInt(e.target.value) || 1000 })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Facility Manager</label>
            <select
              value={form.facility_manager_id}
              onChange={(e) => setForm({ ...form, facility_manager_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Unassigned</option>
              {facilityManagers.map((fm) => (
                <option key={fm.id} value={fm.id}>{fm.name} ({fm.email})</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Building"
        message="Are you sure you want to delete this facility record?"
      />
    </div>
  )
}
