import React, { useState, useEffect } from 'react'
import {
  Wrench, Plus, CheckCircle2, Clock, UserCheck, AlertCircle,
  Building2, Gauge, Edit3, MessageSquare, Check
} from 'lucide-react'
import { getMaintenanceTasks, createMaintenanceTask, updateMaintenanceTask, getMyTasks } from '../../api/maintenance'
import { getBuildings } from '../../api/buildings'
import { getMeters } from '../../api/meters'
import { getUsers } from '../../api/users'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import AlertBanner from '../../components/common/AlertBanner'
import { useAuth } from '../../contexts/AuthContext'

export default function Maintenance() {
  const { user, isTechnician, isFacilityManager } = useAuth()
  const [tasks, setTasks] = useState([])
  const [buildings, setBuildings] = useState([])
  const [meters, setMeters] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [viewMode, setViewMode] = useState(user?.role === 'technician' ? 'my_tasks' : 'all')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [updateModalTask, setUpdateModalTask] = useState(null)

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    building_id: '',
    meter_id: '',
    assigned_to: '',
    priority: 'medium'
  })

  const [updateForm, setUpdateForm] = useState({
    status: 'in_progress',
    notes: ''
  })

  const loadData = async () => {
    try {
      const isTechOnly = user?.role === 'technician' || viewMode === 'my_tasks'
      const [tasksRes, bldgsRes, metersRes, techsRes] = await Promise.all([
        isTechOnly ? getMyTasks() : getMaintenanceTasks(),
        getBuildings(),
        getMeters(),
        getUsers({ role: 'technician' })
      ])
      setTasks(tasksRes.data || [])
      setBuildings(bldgsRes.data || [])
      setMeters(metersRes.data || [])
      setTechnicians(techsRes.data || [])
    } catch (err) {
      setError('Failed to fetch maintenance tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [viewMode])

  const handleOpenCreate = () => {
    setCreateForm({
      title: '',
      description: '',
      building_id: buildings[0]?.id || '',
      meter_id: '',
      assigned_to: technicians[0]?.id || '',
      priority: 'medium'
    })
    setIsCreateOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createMaintenanceTask(createForm)
      setSuccess('Maintenance task created.')
      setIsCreateOpen(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch task.')
    }
  }

  const handleOpenUpdate = (task) => {
    setUpdateModalTask(task)
    setUpdateForm({
      status: task.status || 'in_progress',
      notes: task.notes || ''
    })
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await updateMaintenanceTask(updateModalTask.id, updateForm)
      setSuccess('Task progress updated.')
      setUpdateModalTask(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.')
    }
  }

  const columns = [
    {
      header: 'Task',
      accessor: 'title',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-white font-mono text-xs">{val}</div>
          {row.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{row.description}</div>}
        </div>
      )
    },
    {
      header: 'Building',
      accessor: 'building_name',
      render: (val) => <span className="text-xs font-mono text-slate-300">{val || '—'}</span>
    },
    {
      header: 'Assigned To',
      accessor: 'assigned_to_name',
      render: (val) => (
        <span className="text-xs font-mono text-amber-400">{val || 'Unassigned'}</span>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (val) => <StatusBadge status={val} />
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
        <button
          onClick={() => handleOpenUpdate(row)}
          className="px-2.5 py-1 text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 flex items-center gap-1 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Update
        </button>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Maintenance</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== 'technician' && (
            <div className="flex items-center gap-1 bg-[#0A0E17] p-1 rounded-xl text-xs font-mono border border-slate-800">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setViewMode('my_tasks')}
                className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'my_tasks' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Assigned
              </button>
            </div>
          )}

          {isFacilityManager && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {/* Main Table */}
      <div className="bg-[#101827] rounded-2xl border border-slate-800/80 p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={tasks}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search maintenance tasks..."
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Dispatch Maintenance Task"
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
            <label className="block text-slate-300 font-semibold mb-1">Title</label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Task summary"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              placeholder="Task details"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Building</label>
              <select
                value={createForm.building_id}
                onChange={(e) => setCreateForm({ ...createForm, building_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assign Technician</label>
              <select
                value={createForm.assigned_to}
                onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Priority</label>
            <select
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Update Modal */}
      <Modal
        isOpen={!!updateModalTask}
        onClose={() => setUpdateModalTask(null)}
        title="Update Task Status"
        footer={
          <>
            <button
              onClick={() => setUpdateModalTask(null)}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm"
            >
              Save Update
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Status</label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Maintenance Notes</label>
            <textarea
              rows={4}
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[#0B101D] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              placeholder="Add technician inspection notes..."
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
