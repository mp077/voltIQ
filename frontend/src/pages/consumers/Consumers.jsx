import React, { useState, useEffect } from 'react'
import { Plus, Users, Search, Trash2, Edit2, Building2, Phone, Mail } from 'lucide-react'
import { getConsumers, createConsumer, updateConsumer, deleteConsumer } from '../../api/consumers'
import { getBuildings } from '../../api/buildings'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import AlertBanner from '../../components/common/AlertBanner'
import { useAuth } from '../../contexts/AuthContext'

export default function Consumers() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [consumers, setConsumers] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact: '',
    assigned_building_id: '',
    tariff_category_id: 1,
    username: '',
    password: ''
  })

  const loadData = async () => {
    try {
      const [consRes, bldgsRes] = await Promise.all([
        getConsumers(),
        getBuildings()
      ])
      setConsumers(consRes.data || [])
      setBuildings(bldgsRes.data || [])
    } catch (err) {
      setError('Failed to fetch consumers.')
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
      email: '',
      contact: '',
      assigned_building_id: buildings[0]?.id || 1,
      tariff_category_id: 1,
      username: '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      email: item.email || '',
      contact: item.contact || '',
      assigned_building_id: item.assigned_building_id,
      tariff_category_id: item.tariff_category_id || 1,
      username: '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingItem) {
        await updateConsumer(editingItem.id, form)
        setSuccess('Consumer updated.')
      } else {
        await createConsumer(form)
        setSuccess('Consumer registered.')
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
      await deleteConsumer(deleteId)
      setSuccess('Consumer removed.')
      setDeleteId(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed.')
    }
  }

  const columns = [
    {
      header: 'Code',
      accessor: 'consumer_code',
      render: (val, row) => (
        <span className="font-mono font-semibold text-amber-400">{val || `CNS-${row.id}`}</span>
      )
    },
    {
      header: 'Consumer',
      accessor: 'name',
      render: (val) => <span className="font-semibold text-white">{val}</span>
    },
    {
      header: 'Contact',
      accessor: 'email',
      render: (val, row) => (
        <div className="text-xs space-y-0.5 font-mono">
          <div className="text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" />{val || '—'}</div>
          <div className="text-slate-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" />{row.contact || '—'}</div>
        </div>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          {val || 'General Campus'}
        </span>
      )
    },
    {
      header: 'Tariff',
      accessor: 'tariff_name',
      render: (val) => (
        <span className="text-xs font-mono font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
          {val || 'Standard'}
        </span>
      )
    },
    ...(isAdmin ? [{
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
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
        </div>
      )
    }] : [])
  ]

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Consumers</h1>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Consumer
          </button>
        )}
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Main Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={consumers}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search by name, code, email..."
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Consumer' : 'Add Consumer'}
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
            <label className="block text-slate-300 font-semibold mb-1">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Consumer name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="email@domain.com"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phone</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="+1 555-0100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Building</label>
              <select
                value={form.assigned_building_id}
                onChange={(e) => setForm({ ...form, assigned_building_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tariff</label>
              <select
                value={form.tariff_category_id}
                onChange={(e) => setForm({ ...form, tariff_category_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={1}>Domestic Standard ($0.14/kWh)</option>
                <option value={2}>Commercial General ($0.18/kWh)</option>
                <option value={3}>Industrial High-Load ($0.12/kWh)</option>
                <option value={4}>Peak Flex Dynamic ($0.16/kWh)</option>
              </select>
            </div>
          </div>

          {!editingItem && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Login Credentials</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Consumer"
        message="Are you sure you want to delete this consumer record?"
      />
    </div>
  )
}
